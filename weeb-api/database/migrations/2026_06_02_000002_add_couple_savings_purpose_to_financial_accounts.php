<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        DB::statement('ALTER TABLE financial_accounts DROP CONSTRAINT IF EXISTS financial_accounts_purpose_check');
        DB::statement("ALTER TABLE financial_accounts ADD CONSTRAINT financial_accounts_purpose_check CHECK (purpose IN ('daily_spending', 'salary', 'savings', 'couple_savings', 'emergency_fund', 'bills', 'wishlist', 'investment', 'other'))");
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        DB::statement('ALTER TABLE financial_accounts DROP CONSTRAINT IF EXISTS financial_accounts_purpose_check');
        DB::statement("ALTER TABLE financial_accounts ADD CONSTRAINT financial_accounts_purpose_check CHECK (purpose IN ('daily_spending', 'salary', 'savings', 'emergency_fund', 'bills', 'wishlist', 'investment', 'other'))");
    }
};
