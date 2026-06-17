<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_profiles', function (Blueprint $table) {
            $table->string('account_mode', 20)->default('couple')->after('daily_safe_amount_target');
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_account_mode_check CHECK (account_mode IN ('personal', 'couple'))");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_account_mode_check');
        }

        Schema::table('user_profiles', function (Blueprint $table) {
            $table->dropColumn('account_mode');
        });
    }
};
