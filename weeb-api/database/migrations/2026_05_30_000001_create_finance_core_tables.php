<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('financial_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name', 80);
            $table->string('type', 20)->default('cash');
            $table->decimal('opening_balance', 14, 2)->default(0);
            $table->decimal('current_balance', 14, 2)->default(0);
            $table->boolean('is_default')->default(false);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['user_id', 'is_active']);
            $table->index(['user_id', 'type']);
        });

        Schema::create('transaction_categories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('name', 80);
            $table->string('slug', 100);
            $table->string('transaction_type', 20);
            $table->string('need_type', 20)->nullable();
            $table->string('icon', 60)->nullable();
            $table->string('color', 20)->nullable();
            $table->boolean('is_default')->default(false);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['user_id', 'slug', 'transaction_type']);
            $table->index(['user_id', 'transaction_type']);
            $table->index(['is_default', 'transaction_type']);
        });

        Schema::create('budgets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->date('month');
            $table->decimal('planned_income', 14, 2)->default(0);
            $table->decimal('planned_expense', 14, 2)->default(0);
            $table->decimal('daily_safe_amount', 14, 2)->nullable();
            $table->string('status', 20)->default('draft');
            $table->timestamps();

            $table->unique(['user_id', 'month']);
            $table->index(['user_id', 'status']);
        });

        Schema::create('budget_categories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('budget_id')->constrained()->cascadeOnDelete();
            $table->foreignId('category_id')->constrained('transaction_categories')->restrictOnDelete();
            $table->decimal('allocated_amount', 14, 2);
            $table->decimal('spent_amount_cache', 14, 2)->default(0);
            $table->unsignedTinyInteger('allocation_percent')->nullable();
            $table->timestamps();

            $table->unique(['budget_id', 'category_id']);
            $table->index('category_id');
        });

        Schema::create('saving_goals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name', 120);
            $table->string('type', 30)->default('saving');
            $table->decimal('target_amount', 14, 2);
            $table->decimal('current_amount', 14, 2)->default(0);
            $table->date('target_date')->nullable();
            $table->unsignedTinyInteger('priority')->default(3);
            $table->string('status', 20)->default('active');
            $table->timestamps();
            $table->softDeletes();

            $table->index(['user_id', 'status']);
            $table->index(['user_id', 'type']);
            $table->index(['user_id', 'target_date']);
        });

        Schema::create('bills', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('category_id')->nullable()->constrained('transaction_categories')->nullOnDelete();
            $table->string('name', 120);
            $table->decimal('amount_estimate', 14, 2);
            $table->unsignedTinyInteger('due_day')->nullable();
            $table->date('next_due_date')->nullable();
            $table->string('frequency', 20)->default('monthly');
            $table->json('reminder_days')->nullable();
            $table->string('status', 20)->default('active');
            $table->timestamps();
            $table->softDeletes();

            $table->index(['user_id', 'status', 'next_due_date']);
            $table->index(['user_id', 'frequency']);
        });

        Schema::create('recurring_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('account_id')->nullable()->constrained('financial_accounts')->nullOnDelete();
            $table->foreignId('category_id')->nullable()->constrained('transaction_categories')->nullOnDelete();
            $table->string('name', 120);
            $table->string('transaction_type', 20);
            $table->decimal('amount', 14, 2);
            $table->string('frequency', 20)->default('monthly');
            $table->unsignedTinyInteger('day_of_month')->nullable();
            $table->date('next_run_date')->nullable();
            $table->string('status', 20)->default('active');
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['user_id', 'status', 'next_run_date']);
            $table->index(['user_id', 'transaction_type']);
        });

        Schema::create('payday_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->date('expected_date');
            $table->date('paid_date')->nullable();
            $table->decimal('expected_amount', 14, 2)->nullable();
            $table->decimal('received_amount', 14, 2)->nullable();
            $table->string('status', 20)->default('expected');
            $table->timestamps();

            $table->unique(['user_id', 'expected_date']);
            $table->index(['user_id', 'status', 'expected_date']);
        });

        Schema::create('wishlists', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name', 120);
            $table->decimal('estimated_amount', 14, 2);
            $table->string('need_type', 20)->default('want');
            $table->unsignedTinyInteger('waiting_days')->default(7);
            $table->date('waiting_until')->nullable();
            $table->string('status', 30)->default('waiting');
            $table->json('impact_snapshot')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['user_id', 'status', 'waiting_until']);
            $table->index(['user_id', 'need_type']);
        });

        Schema::create('transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('account_id')->nullable()->constrained('financial_accounts')->nullOnDelete();
            $table->foreignId('category_id')->nullable()->constrained('transaction_categories')->nullOnDelete();
            $table->foreignId('recurring_transaction_id')->nullable()->constrained('recurring_transactions')->nullOnDelete();
            $table->foreignId('bill_id')->nullable()->constrained('bills')->nullOnDelete();
            $table->foreignId('saving_goal_id')->nullable()->constrained('saving_goals')->nullOnDelete();
            $table->foreignId('wishlist_id')->nullable()->constrained('wishlists')->nullOnDelete();
            $table->string('transaction_type', 20);
            $table->decimal('amount', 14, 2);
            $table->string('need_type', 20)->nullable();
            $table->date('transaction_date');
            $table->timestamp('occurred_at')->nullable();
            $table->string('description', 160)->nullable();
            $table->text('notes')->nullable();
            $table->string('source', 80)->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['user_id', 'transaction_date']);
            $table->index(['user_id', 'transaction_type', 'transaction_date']);
            $table->index(['user_id', 'category_id', 'transaction_date']);
            $table->index(['user_id', 'need_type', 'transaction_date']);
            $table->index(['bill_id', 'transaction_date']);
            $table->index(['saving_goal_id', 'transaction_date']);
        });

        Schema::create('saving_goal_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('saving_goal_id')->constrained()->cascadeOnDelete();
            $table->foreignId('transaction_id')->nullable()->constrained()->nullOnDelete();
            $table->string('entry_type', 20);
            $table->decimal('amount', 14, 2);
            $table->date('entry_date');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['saving_goal_id', 'entry_date']);
            $table->index('transaction_id');
        });

        Schema::create('bill_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('bill_id')->constrained()->cascadeOnDelete();
            $table->foreignId('transaction_id')->nullable()->constrained()->nullOnDelete();
            $table->date('period_month');
            $table->date('due_date');
            $table->decimal('amount_due', 14, 2);
            $table->decimal('amount_paid', 14, 2)->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->string('status', 20)->default('unpaid');
            $table->timestamps();

            $table->unique(['bill_id', 'period_month']);
            $table->index(['status', 'due_date']);
            $table->index('transaction_id');
        });

        Schema::create('monthly_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->date('month');
            $table->decimal('total_income', 14, 2)->default(0);
            $table->decimal('total_expense', 14, 2)->default(0);
            $table->decimal('total_saving', 14, 2)->default(0);
            $table->decimal('remaining_amount', 14, 2)->default(0);
            $table->unsignedTinyInteger('financial_health_score')->nullable();
            $table->json('summary')->nullable();
            $table->timestamp('generated_at')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'month']);
            $table->index(['user_id', 'financial_health_score']);
        });

        Schema::create('financial_insights', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->date('month')->nullable();
            $table->string('type', 60);
            $table->string('severity', 20)->default('info');
            $table->string('title', 160);
            $table->text('message');
            $table->json('payload')->nullable();
            $table->string('status', 20)->default('active');
            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status', 'created_at']);
            $table->index(['user_id', 'type', 'month']);
            $table->index(['severity', 'status']);
        });

        $this->addCheckConstraints();
    }

    public function down(): void
    {
        Schema::dropIfExists('financial_insights');
        Schema::dropIfExists('monthly_reports');
        Schema::dropIfExists('bill_payments');
        Schema::dropIfExists('saving_goal_entries');
        Schema::dropIfExists('transactions');
        Schema::dropIfExists('wishlists');
        Schema::dropIfExists('payday_events');
        Schema::dropIfExists('recurring_transactions');
        Schema::dropIfExists('bills');
        Schema::dropIfExists('saving_goals');
        Schema::dropIfExists('budget_categories');
        Schema::dropIfExists('budgets');
        Schema::dropIfExists('transaction_categories');
        Schema::dropIfExists('financial_accounts');
    }

    private function addCheckConstraints(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        DB::statement("ALTER TABLE financial_accounts ADD CONSTRAINT financial_accounts_type_check CHECK (type IN ('cash', 'bank', 'ewallet', 'other'))");
        DB::statement("ALTER TABLE transaction_categories ADD CONSTRAINT transaction_categories_transaction_type_check CHECK (transaction_type IN ('income', 'expense', 'both'))");
        DB::statement("ALTER TABLE transaction_categories ADD CONSTRAINT transaction_categories_need_type_check CHECK (need_type IS NULL OR need_type IN ('need', 'want', 'saving', 'debt'))");
        DB::statement("ALTER TABLE budgets ADD CONSTRAINT budgets_status_check CHECK (status IN ('draft', 'active', 'closed'))");
        DB::statement("ALTER TABLE budget_categories ADD CONSTRAINT budget_categories_allocated_amount_check CHECK (allocated_amount >= 0)");
        DB::statement("ALTER TABLE budget_categories ADD CONSTRAINT budget_categories_spent_amount_cache_check CHECK (spent_amount_cache >= 0)");
        DB::statement("ALTER TABLE budget_categories ADD CONSTRAINT budget_categories_allocation_percent_check CHECK (allocation_percent IS NULL OR allocation_percent <= 100)");
        DB::statement("ALTER TABLE saving_goals ADD CONSTRAINT saving_goals_type_check CHECK (type IN ('saving', 'emergency_fund', 'wishlist'))");
        DB::statement("ALTER TABLE saving_goals ADD CONSTRAINT saving_goals_status_check CHECK (status IN ('active', 'paused', 'completed', 'cancelled'))");
        DB::statement("ALTER TABLE saving_goals ADD CONSTRAINT saving_goals_target_amount_check CHECK (target_amount > 0)");
        DB::statement("ALTER TABLE saving_goals ADD CONSTRAINT saving_goals_current_amount_check CHECK (current_amount >= 0)");
        DB::statement("ALTER TABLE bills ADD CONSTRAINT bills_amount_estimate_check CHECK (amount_estimate >= 0)");
        DB::statement("ALTER TABLE bills ADD CONSTRAINT bills_due_day_check CHECK (due_day IS NULL OR due_day BETWEEN 1 AND 31)");
        DB::statement("ALTER TABLE bills ADD CONSTRAINT bills_frequency_check CHECK (frequency IN ('weekly', 'monthly', 'yearly', 'once'))");
        DB::statement("ALTER TABLE bills ADD CONSTRAINT bills_status_check CHECK (status IN ('active', 'paused', 'archived'))");
        DB::statement("ALTER TABLE recurring_transactions ADD CONSTRAINT recurring_transactions_transaction_type_check CHECK (transaction_type IN ('income', 'expense'))");
        DB::statement("ALTER TABLE recurring_transactions ADD CONSTRAINT recurring_transactions_amount_check CHECK (amount > 0)");
        DB::statement("ALTER TABLE recurring_transactions ADD CONSTRAINT recurring_transactions_frequency_check CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly'))");
        DB::statement("ALTER TABLE recurring_transactions ADD CONSTRAINT recurring_transactions_day_of_month_check CHECK (day_of_month IS NULL OR day_of_month BETWEEN 1 AND 31)");
        DB::statement("ALTER TABLE recurring_transactions ADD CONSTRAINT recurring_transactions_status_check CHECK (status IN ('active', 'paused', 'archived'))");
        DB::statement("ALTER TABLE payday_events ADD CONSTRAINT payday_events_status_check CHECK (status IN ('expected', 'received', 'missed', 'adjusted'))");
        DB::statement("ALTER TABLE payday_events ADD CONSTRAINT payday_events_expected_amount_check CHECK (expected_amount IS NULL OR expected_amount >= 0)");
        DB::statement("ALTER TABLE payday_events ADD CONSTRAINT payday_events_received_amount_check CHECK (received_amount IS NULL OR received_amount >= 0)");
        DB::statement("ALTER TABLE wishlists ADD CONSTRAINT wishlists_need_type_check CHECK (need_type IN ('need', 'want'))");
        DB::statement("ALTER TABLE wishlists ADD CONSTRAINT wishlists_estimated_amount_check CHECK (estimated_amount > 0)");
        DB::statement("ALTER TABLE wishlists ADD CONSTRAINT wishlists_status_check CHECK (status IN ('waiting', 'approved', 'converted_to_goal', 'bought', 'cancelled'))");
        DB::statement("ALTER TABLE transactions ADD CONSTRAINT transactions_transaction_type_check CHECK (transaction_type IN ('income', 'expense'))");
        DB::statement("ALTER TABLE transactions ADD CONSTRAINT transactions_need_type_check CHECK (need_type IS NULL OR need_type IN ('need', 'want', 'saving', 'debt'))");
        DB::statement("ALTER TABLE transactions ADD CONSTRAINT transactions_amount_check CHECK (amount > 0)");
        DB::statement("ALTER TABLE saving_goal_entries ADD CONSTRAINT saving_goal_entries_entry_type_check CHECK (entry_type IN ('deposit', 'withdrawal', 'adjustment'))");
        DB::statement("ALTER TABLE saving_goal_entries ADD CONSTRAINT saving_goal_entries_amount_check CHECK (amount > 0)");
        DB::statement("ALTER TABLE bill_payments ADD CONSTRAINT bill_payments_status_check CHECK (status IN ('unpaid', 'paid', 'late', 'skipped'))");
        DB::statement("ALTER TABLE bill_payments ADD CONSTRAINT bill_payments_amount_due_check CHECK (amount_due >= 0)");
        DB::statement("ALTER TABLE bill_payments ADD CONSTRAINT bill_payments_amount_paid_check CHECK (amount_paid IS NULL OR amount_paid >= 0)");
        DB::statement("ALTER TABLE monthly_reports ADD CONSTRAINT monthly_reports_financial_health_score_check CHECK (financial_health_score IS NULL OR financial_health_score BETWEEN 0 AND 100)");
        DB::statement("ALTER TABLE financial_insights ADD CONSTRAINT financial_insights_severity_check CHECK (severity IN ('info', 'success', 'warning', 'danger'))");
        DB::statement("ALTER TABLE financial_insights ADD CONSTRAINT financial_insights_status_check CHECK (status IN ('active', 'read', 'dismissed', 'expired'))");
    }
};
