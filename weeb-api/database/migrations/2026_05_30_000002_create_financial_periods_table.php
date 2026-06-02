<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('financial_periods', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name', 120);
            $table->date('start_date');
            $table->date('end_date');
            $table->date('payday_date')->nullable();
            $table->decimal('opening_balance', 14, 2)->default(0);
            $table->decimal('income_target', 14, 2)->default(0);
            $table->decimal('expense_limit', 14, 2)->default(0);
            $table->string('status', 20)->default('planned');
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['user_id', 'status']);
            $table->index(['user_id', 'start_date', 'end_date']);
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE financial_periods ADD CONSTRAINT financial_periods_status_check CHECK (status IN ('planned', 'active', 'closed'))");
            DB::statement("ALTER TABLE financial_periods ADD CONSTRAINT financial_periods_dates_check CHECK (end_date >= start_date)");
            DB::statement("ALTER TABLE financial_periods ADD CONSTRAINT financial_periods_amounts_check CHECK (opening_balance >= 0 AND income_target >= 0 AND expense_limit >= 0)");
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('financial_periods');
    }
};
