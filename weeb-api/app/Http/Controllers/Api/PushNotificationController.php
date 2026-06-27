<?php

namespace App\Http\Controllers\Api;

use App\Http\Concerns\RespondsWithApi;
use App\Http\Controllers\Controller;
use App\Services\Notifications\TransactionReminderPushService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PushNotificationController extends Controller
{
    use RespondsWithApi;

    public function __construct(
        protected TransactionReminderPushService $service
    ) {
    }

    public function vapidPublicKey(): JsonResponse
    {
        return $this->success([
            'public_key' => $this->service->publicKey(),
        ], 'VAPID public key loaded.');
    }

    public function subscribe(Request $request): JsonResponse
    {
        $data = $request->validate([
            'endpoint' => ['required', 'url'],
            'contentEncoding' => ['nullable', 'string', 'max:40'],
            'keys' => ['required', 'array'],
            'keys.p256dh' => ['required', 'string'],
            'keys.auth' => ['required', 'string'],
        ]);

        $subscription = $this->service->subscribe($request->user(), $data);

        return $this->success($subscription, 'Push subscription saved.');
    }

    public function unsubscribe(Request $request): JsonResponse
    {
        $data = $request->validate([
            'endpoint' => ['required', 'url'],
        ]);

        $this->service->unsubscribe($request->user(), $data['endpoint']);

        return $this->success(null, 'Push subscription removed.');
    }
}
