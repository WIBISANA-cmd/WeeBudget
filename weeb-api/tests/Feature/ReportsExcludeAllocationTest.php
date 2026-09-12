<?php

namespace Tests\Feature;

use App\Models\FinancialAccount;
use App\Models\Transaction;
use App\Models\TransactionCategory;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReportsExcludeAllocationTest extends TestCase
{
    use RefreshDatabase;

    public function test_monthly_report_excludes_account_allocation_transactions(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test')->plainTextToken;

        Transaction::query()->create([
            'user_id' => $user->id,
            'transaction_type' => 'income',
            'amount' => 1000000,
            'transaction_date' => '2026-06-10',
            'description' => 'Gaji',
        ]);

        Transaction::query()->create([
            'user_id' => $user->id,
            'transaction_type' => 'expense',
            'amount' => 250000,
            'need_type' => 'need',
            'transaction_date' => '2026-06-11',
            'description' => 'Belanja bulanan',
        ]);

        Transaction::query()->create([
            'user_id' => $user->id,
            'transaction_type' => 'expense',
            'amount' => 300000,
            'need_type' => 'saving',
            'transaction_date' => '2026-06-12',
            'description' => 'Alokasi ke tabungan',
            'source' => 'account_allocation',
        ]);

        Transaction::query()->create([
            'user_id' => $user->id,
            'transaction_type' => 'income',
            'amount' => 300000,
            'transaction_date' => '2026-06-12',
            'description' => 'Alokasi diterima',
            'source' => 'account_allocation',
        ]);

        $this->withToken($token)
            ->getJson('/api/reports/monthly/current?month=2026-06-01')
            ->assertOk()
            ->assertJsonPath('data.total_income', '1000000.00')
            ->assertJsonPath('data.total_expense', '250000.00')
            ->assertJsonPath('data.total_saving', '0.00')
            ->assertJsonPath('data.remaining_amount', '750000.00');
    }

    public function test_couple_savings_stays_out_but_the_allocation_into_it_counts_as_expense(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test')->plainTextToken;
        $spending = $this->account($user, 'daily_spending');
        $couple = $this->account($user, 'couple_savings');

        Transaction::query()->create([
            'user_id' => $user->id,
            'account_id' => $spending->id,
            'transaction_type' => 'income',
            'amount' => 1000000,
            'transaction_date' => '2026-06-10',
            'description' => 'Gaji',
        ]);

        // The two legs of one allocation into the shared pot.
        Transaction::query()->create([
            'user_id' => $user->id,
            'account_id' => $spending->id,
            'transaction_type' => 'expense',
            'amount' => 200000,
            'transaction_date' => '2026-06-11',
            'description' => 'Alokasi ke Tabungan Berdua',
            'source' => 'account_allocation',
            'metadata' => ['direction' => 'out', 'counterpart_account_id' => $couple->id],
        ]);
        Transaction::query()->create([
            'user_id' => $user->id,
            'account_id' => $couple->id,
            'transaction_type' => 'income',
            'amount' => 200000,
            'need_type' => 'saving',
            'transaction_date' => '2026-06-11',
            'description' => 'Alokasi dari Kebutuhan',
            'source' => 'account_allocation',
            'metadata' => ['direction' => 'in', 'counterpart_account_id' => $spending->id],
        ]);

        // A deposit booked straight on the shared pot: the pot's own bookkeeping, not this report's.
        Transaction::query()->create([
            'user_id' => $user->id,
            'account_id' => $couple->id,
            'transaction_type' => 'income',
            'amount' => 50000,
            'need_type' => 'saving',
            'transaction_date' => '2026-06-12',
            'description' => 'Setoran tabungan berdua',
            'source' => $user->email,
        ]);

        // An allocation between two own accounts stays invisible: it invents income and expense.
        $savings = $this->account($user, 'savings');
        Transaction::query()->create([
            'user_id' => $user->id,
            'account_id' => $spending->id,
            'transaction_type' => 'expense',
            'amount' => 400000,
            'transaction_date' => '2026-06-13',
            'description' => 'Alokasi ke TABUNGAN',
            'source' => 'account_allocation',
            'metadata' => ['direction' => 'out', 'counterpart_account_id' => $savings->id],
        ]);

        $this->withToken($token)
            ->getJson('/api/reports/monthly?start=2026-06-01&end=2026-06-30&group=month')
            ->assertOk()
            ->assertJsonPath('data.0.total_income', 1000000)
            ->assertJsonPath('data.0.total_expense', 200000)
            ->assertJsonPath('data.0.cumulative_amount', 800000);
    }

    private function account(User $user, string $purpose): FinancialAccount
    {
        return FinancialAccount::query()->create([
            'user_id' => $user->id,
            'name' => ucfirst($purpose),
            'type' => 'bank',
            'purpose' => $purpose,
            'opening_balance' => 0,
            'current_balance' => 0,
            'is_default' => false,
            'is_active' => true,
        ]);
    }

    public function test_category_breakdown_excludes_account_allocation_transactions(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test')->plainTextToken;
        $category = TransactionCategory::query()->create([
            'user_id' => $user->id,
            'name' => 'Makan',
            'slug' => 'makan',
            'transaction_type' => 'expense',
            'need_type' => 'need',
            'icon' => 'utensils',
            'color' => '#F97316',
            'is_default' => false,
            'sort_order' => 1,
        ]);

        Transaction::query()->create([
            'user_id' => $user->id,
            'category_id' => $category->id,
            'transaction_type' => 'expense',
            'amount' => 50000,
            'need_type' => 'need',
            'transaction_date' => '2026-06-10',
            'description' => 'Makan siang',
        ]);

        Transaction::query()->create([
            'user_id' => $user->id,
            'category_id' => $category->id,
            'transaction_type' => 'expense',
            'amount' => 80000,
            'need_type' => 'need',
            'transaction_date' => '2026-06-10',
            'description' => 'Alokasi internal',
            'source' => 'account_allocation',
        ]);

        $this->withToken($token)
            ->getJson('/api/reports/category-breakdown?month=2026-06-01')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.category_name', 'Makan')
            ->assertJsonPath('data.0.total', 50000)
            ->assertJsonPath('data.0.transaction_count', 1);
    }
}
