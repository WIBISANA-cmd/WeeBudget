<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_profiles', function (Blueprint $table) {
            $table->boolean('transaction_reminder_enabled')->default(false)->after('account_mode');
            $table->string('transaction_reminder_time', 5)->nullable()->after('transaction_reminder_enabled');
            $table->timestamp('transaction_reminder_last_sent_at')->nullable()->after('transaction_reminder_time');
        });
    }

    public function down(): void
    {
        Schema::table('user_profiles', function (Blueprint $table) {
            $table->dropColumn([
                'transaction_reminder_enabled',
                'transaction_reminder_time',
                'transaction_reminder_last_sent_at',
            ]);
        });
    }
};
