<?php

namespace Tests\Feature;

use App\Models\FinancialAccount;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PocketFlowReportTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private FinancialAccount $salary;

    private FinancialAccount $wallet;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->salary = $this->account('BCA Gaji', 'salary', 5_000_000);
        $this->wallet = $this->account('GoPay', 'daily_spending', 350_000);

        $this->transaction($this->salary, 'income', 7_000_000, '2026-09-25');
        // A top-up: out of the salary account, into the wallet.
        $this->transaction($this->salary, 'expense', 500_000, '2026-09-25', 'account_allocation');
        $this->transaction($this->wallet, 'income', 500_000, '2026-09-25', 'account_allocation');
        $this->transaction($this->wallet, 'expense', 150_000, '2026-09-26');
        // Outside the range.
        $this->transaction($this->wallet, 'expense', 90_000, '2026-09-20');
    }

    public function test_need_scope_counts_top_ups_into_the_daily_pocket(): void
    {
        $data = $this->flow(['scope' => 'need'])->json('data');

        $this->assertSame(1, $data['account_count']);
        $this->assertEquals(350_000, $data['balance']);
        $this->assertSame(['2026-09-25', '2026-09-26', '2026-09-27'], array_column($data['series'], 'period'));
        $this->assertEquals([500_000, 0, 0], array_column($data['series'], 'total_income'));
        $this->assertEquals([0, 150_000, 0], array_column($data['series'], 'total_expense'));
    }

    public function test_all_scope_ignores_transfers_between_own_accounts(): void
    {
        $data = $this->flow(['scope' => 'all'])->json('data');

        $this->assertSame(2, $data['account_count']);
        $this->assertEquals(5_350_000, $data['balance']);
        $this->assertEquals([7_000_000, 0, 0], array_column($data['series'], 'total_income'));
        $this->assertEquals([0, 150_000, 0], array_column($data['series'], 'total_expense'));
    }

    public function test_another_users_accounts_stay_out(): void
    {
        $other = User::factory()->create();
        $account = FinancialAccount::query()->create(['user_id' => $other->id, 'name' => 'Dompet', 'type' => 'cash', 'purpose' => 'daily_spending', 'current_balance' => 999_000, 'is_active' => true]);
        Transaction::query()->create(['user_id' => $other->id, 'account_id' => $account->id, 'transaction_type' => 'expense', 'amount' => 777_000, 'transaction_date' => '2026-09-26']);

        $data = $this->flow(['scope' => 'need'])->json('data');

        $this->assertEquals(350_000, $data['balance']);
        $this->assertEquals(150_000, array_sum(array_column($data['series'], 'total_expense')));
    }

    private function flow(array $params)
    {
        return $this->withToken($this->user->createToken('test')->plainTextToken)
            ->getJson('/api/reports/pocket-flow?'.http_build_query(['start' => '2026-09-25', 'end' => '2026-09-27', ...$params]))
            ->assertOk();
    }

    private function account(string $name, string $purpose, int $balance): FinancialAccount
    {
        return FinancialAccount::query()->create([
            'user_id' => $this->user->id,
            'name' => $name,
            'type' => 'bank',
            'purpose' => $purpose,
            'current_balance' => $balance,
            'is_active' => true,
        ]);
    }

    private function transaction(FinancialAccount $account, string $type, int $amount, string $date, ?string $source = null): void
    {
        Transaction::query()->create([
            'user_id' => $this->user->id,
            'account_id' => $account->id,
            'transaction_type' => $type,
            'amount' => $amount,
            'transaction_date' => $date,
            'source' => $source,
        ]);
    }
}
