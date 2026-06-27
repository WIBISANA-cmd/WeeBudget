<?php

namespace App\Services\Notifications;

use App\Models\PushSubscription;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Storage;
use Minishlink\WebPush\Subscription;
use Minishlink\WebPush\VAPID;
use Minishlink\WebPush\WebPush;

class TransactionReminderPushService
{
    public function publicKey(): string
    {
        return $this->vapidKeys()['publicKey'];
    }

    public function subscribe(User $user, array $payload): PushSubscription
    {
        return $user->pushSubscriptions()->updateOrCreate(
            ['endpoint' => $payload['endpoint']],
            [
                'public_key' => data_get($payload, 'keys.p256dh'),
                'auth_token' => data_get($payload, 'keys.auth'),
                'content_encoding' => $payload['contentEncoding'] ?? null,
                'is_active' => true,
                'last_used_at' => now(),
            ]
        );
    }

    public function unsubscribe(User $user, string $endpoint): void
    {
        $user->pushSubscriptions()
            ->where('endpoint', $endpoint)
            ->update([
                'is_active' => false,
                'last_used_at' => now(),
            ]);
    }

    public function sendDueReminders(): int
    {
        $sentCount = 0;

        User::query()
            ->with(['profile', 'pushSubscriptions' => fn ($query) => $query->where('is_active', true)])
            ->whereHas('profile', fn ($query) => $query->where('transaction_reminder_enabled', true))
            ->chunkById(100, function (Collection $users) use (&$sentCount) {
                foreach ($users as $user) {
                    if ($this->shouldSendReminder($user)) {
                        $sentCount += $this->sendReminderToUser($user);
                    }
                }
            });

        return $sentCount;
    }

    public function sendReminderToUser(User $user): int
    {
        $subscriptions = $user->pushSubscriptions->where('is_active', true);

        if ($subscriptions->isEmpty()) {
            return 0;
        }

        $webPush = new WebPush([
            'VAPID' => [
                'subject' => rtrim(config('app.url'), '/'),
                'publicKey' => $this->publicKey(),
                'privateKey' => $this->vapidKeys()['privateKey'],
            ],
        ]);

        $payload = json_encode([
            'title' => 'Waktunya catat transaksi',
            'body' => 'Buka WeeBudget dan catat pemasukan atau pengeluaran hari ini sebelum terlupa.',
            'url' => '/transactions',
            'tag' => 'transaction-reminder',
        ], JSON_THROW_ON_ERROR);

        foreach ($subscriptions as $subscription) {
            $webPush->queueNotification(
                Subscription::create([
                    'endpoint' => $subscription->endpoint,
                    'publicKey' => $subscription->public_key,
                    'authToken' => $subscription->auth_token,
                    'contentEncoding' => $subscription->content_encoding ?: 'aesgcm',
                ]),
                $payload
            );
        }

        $delivered = 0;
        foreach ($webPush->flush() as $report) {
            $endpoint = $report->getRequest()->getUri()->__toString();
            $subscription = $subscriptions->firstWhere('endpoint', $endpoint);

            if (! $subscription) {
                continue;
            }

            if ($report->isSuccess()) {
                $delivered++;
                $subscription->forceFill([
                    'last_used_at' => now(),
                    'is_active' => true,
                ])->save();
                continue;
            }

            $subscription->forceFill([
                'is_active' => false,
                'last_used_at' => now(),
            ])->save();
        }

        if ($delivered > 0) {
            $user->profile()->update([
                'transaction_reminder_last_sent_at' => now(),
            ]);
        }

        return $delivered;
    }

    protected function shouldSendReminder(User $user): bool
    {
        $profile = $user->profile;
        if (! $profile || ! $profile->transaction_reminder_enabled || blank($profile->transaction_reminder_time)) {
            return false;
        }

        $timezone = $profile->timezone ?: config('app.timezone');
        $now = CarbonImmutable::now($timezone);
        $target = CarbonImmutable::createFromFormat('H:i', $profile->transaction_reminder_time, $timezone);

        if ($now->format('H:i') !== $target->format('H:i')) {
            return false;
        }

        if ($profile->transaction_reminder_last_sent_at) {
            $lastSent = CarbonImmutable::parse($profile->transaction_reminder_last_sent_at)->setTimezone($timezone);
            if ($lastSent->isSameDay($now)) {
                return false;
            }
        }

        return true;
    }

    protected function vapidKeys(): array
    {
        $publicKey = env('WEEB_VAPID_PUBLIC_KEY');
        $privateKey = env('WEEB_VAPID_PRIVATE_KEY');

        if ($publicKey && $privateKey) {
            return compact('publicKey', 'privateKey');
        }

        $disk = Storage::build([
            'driver' => 'local',
            'root' => storage_path('app'),
        ]);

        $path = 'webpush-vapid-keys.json';

        if ($disk->exists($path)) {
            return json_decode($disk->get($path), true, 512, JSON_THROW_ON_ERROR);
        }

        $keys = VAPID::createVapidKeys();
        $disk->put($path, json_encode($keys, JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR));

        return $keys;
    }
}
