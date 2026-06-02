<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('financial_accounts', function (Blueprint $table) {
            $table->string('purpose', 40)->default('daily_spending')->after('type');
            $table->string('institution_name', 100)->nullable()->after('purpose');
            $table->string('account_identifier', 80)->nullable()->after('institution_name');
            $table->text('notes')->nullable()->after('is_active');

            $table->index(['user_id', 'purpose']);
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE financial_accounts DROP CONSTRAINT IF EXISTS financial_accounts_type_check');
            DB::statement("ALTER TABLE financial_accounts ADD CONSTRAINT financial_accounts_type_check CHECK (type IN ('cash', 'bank', 'e_wallet', 'digital_bank', 'other'))");
            DB::statement("ALTER TABLE financial_accounts ADD CONSTRAINT financial_accounts_purpose_check CHECK (purpose IN ('daily_spending', 'salary', 'savings', 'emergency_fund', 'bills', 'wishlist', 'investment', 'other'))");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE financial_accounts DROP CONSTRAINT IF EXISTS financial_accounts_purpose_check');
            DB::statement('ALTER TABLE financial_accounts DROP CONSTRAINT IF EXISTS financial_accounts_type_check');
            DB::statement("ALTER TABLE financial_accounts ADD CONSTRAINT financial_accounts_type_check CHECK (type IN ('cash', 'bank', 'ewallet', 'other'))");
        }

        Schema::table('financial_accounts', function (Blueprint $table) {
            $table->dropIndex(['user_id', 'purpose']);
            $table->dropColumn(['purpose', 'institution_name', 'account_identifier', 'notes']);
        });
    }
};
