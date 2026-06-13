<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transaction_categories', function (Blueprint $table) {
            $table->foreignId('account_id')
                ->nullable()
                ->after('user_id')
                ->constrained('financial_accounts')
                ->nullOnDelete();

            $table->index(['user_id', 'account_id']);
        });
    }

    public function down(): void
    {
        Schema::table('transaction_categories', function (Blueprint $table) {
            $table->dropIndex(['user_id', 'account_id']);
            $table->dropConstrainedForeignId('account_id');
        });
    }
};
