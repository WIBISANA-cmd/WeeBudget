<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;
use App\Services\Notifications\TransactionReminderPushService;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('weeb:send-transaction-reminders', function (TransactionReminderPushService $service) {
    $sent = $service->sendDueReminders();
    $this->info("Sent {$sent} transaction reminder notification(s).");
})->purpose('Send scheduled transaction reminder push notifications');

Schedule::command('weeb:send-transaction-reminders')->everyMinute();
