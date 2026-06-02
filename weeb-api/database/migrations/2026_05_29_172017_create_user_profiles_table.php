<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('user_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('currency', 3)->default('IDR');
            $table->string('timezone')->default('Asia/Jakarta');
            $table->unsignedTinyInteger('payday_day')->nullable();
            $table->string('payday_frequency', 20)->default('monthly');
            $table->decimal('monthly_income_estimate', 14, 2)->nullable();
            $table->decimal('daily_safe_amount_target', 14, 2)->nullable();
            $table->date('onboarding_completed_at')->nullable();
            $table->timestamps();
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_payday_day_check CHECK (payday_day IS NULL OR payday_day BETWEEN 1 AND 31)");
            DB::statement("ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_payday_frequency_check CHECK (payday_frequency IN ('weekly', 'biweekly', 'monthly'))");
            DB::statement("ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_monthly_income_estimate_check CHECK (monthly_income_estimate IS NULL OR monthly_income_estimate >= 0)");
            DB::statement("ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_daily_safe_amount_target_check CHECK (daily_safe_amount_target IS NULL OR daily_safe_amount_target >= 0)");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_profiles');
    }
};
