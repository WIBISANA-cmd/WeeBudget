<?php

namespace Tests\Feature;

use App\Models\FinancialAccount;
use App\Models\User;
use App\Services\Finance\AccountBalanceService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TransactionListAllocationTest extends TestCase
{
    use RefreshDatabase;

    private function account(User $user, string $name, string $purpose, float $balance): FinancialAccount
    {
        return FinancialAccount::query()->create([
            'user_id' => $user->id,
            'name' => $name,
            'type' => 'cash',
            'purpose' => $purpose,
            'opening_balance' => $balance,
            'current_balance' => $balance,
            'is_default' => false,
            'is_active' => true,
        ]);
    }

    private function allocate(User $user, FinancialAccount $from, FinancialAccount $to, float $amount): void
    {
        app(AccountBalanceService::class)->allocateBetweenAccounts([
            'source_account_id' => $from->id,
            'destination_account_id' => $to->id,
            'amount' => $amount,
            'transaction_date' => '2026-06-12',
        ], $user->id);
    }

    public function test_allocation_is_listed_once_and_never_as_income_or_expense(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test')->plainTextToken;
        $wallet = $this->account($user, 'Dompet Utama', 'daily_spending', 1000000);
        $savings = $this->account($user, 'Tabungan', 'savings', 0);

        $this->allocate($user, $wallet, $savings, 300000);

        // Both balances still move, so the pair is intact in storage.
        $this->assertSame('700000.00', $wallet->fresh()->current_balance);
        $this->assertSame('300000.00', $savings->fresh()->current_balance);

        // Neither the income nor the expense list counts it.
        $this->withToken($token)->getJson('/api/expenses')->assertOk()->assertJsonCount(0, 'data');
        $this->withToken($token)->getJson('/api/incomes')->assertOk()->assertJsonCount(0, 'data');

        // The combined list shows exactly one row, the outgoing leg, flagged as an allocation.
        $this->withToken($token)->getJson('/api/transactions')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.entry_type', 'account_allocation')
            ->assertJsonPath('data.0.account.name', 'Dompet Utama')
            ->assertJsonPath('data.0.metadata.direction', 'out')
            ->assertJsonPath('data.0.metadata.counterpart_account_name', 'Tabungan');
    }

    public function test_account_filter_keeps_the_leg_that_belongs_to_that_account(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test')->plainTextToken;
        $wallet = $this->account($user, 'Dompet Utama', 'daily_spending', 1000000);
        $savings = $this->account($user, 'Tabungan', 'savings', 0);

        $this->allocate($user, $wallet, $savings, 300000);

        // Scoped to the destination, the incoming leg must still explain the balance change.
        $this->withToken($token)->getJson('/api/transactions?account_id='.$savings->id)
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.metadata.direction', 'in')
            ->assertJsonPath('data.0.metadata.counterpart_account_name', 'Dompet Utama');

        $this->withToken($token)->getJson('/api/transactions?account_id='.$wallet->id)
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.metadata.direction', 'out');
    }

    public function test_real_income_and_expense_are_still_listed(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test')->plainTextToken;
        $wallet = $this->account($user, 'Dompet Utama', 'daily_spending', 1000000);
        $savings = $this->account($user, 'Tabungan', 'savings', 0);

        $this->allocate($user, $wallet, $savings, 300000);

        $this->withToken($token)->postJson('/api/expenses', [
            'account_id' => $wallet->id,
            'amount' => 50000,
            'transaction_date' => '2026-06-13',
            'description' => 'Makan siang',
        ])->assertCreated();

        $this->withToken($token)->getJson('/api/expenses')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.description', 'Makan siang');

        $this->withToken($token)->getJson('/api/transactions')
            ->assertOk()
            ->assertJsonCount(2, 'data');
    }

    public function test_transaction_exposes_the_user_who_recorded_it(): void
    {
        $user = User::factory()->create(['name' => 'Rani']);
        $token = $user->createToken('test')->plainTextToken;
        $wallet = $this->account($user, 'Dompet Utama', 'daily_spending', 1000000);

        $this->withToken($token)->postJson('/api/expenses', [
            'account_id' => $wallet->id,
            'amount' => 50000,
            'transaction_date' => '2026-06-13',
            'description' => 'Makan siang',
        ])->assertCreated();

        $this->withToken($token)->getJson('/api/expenses')
            ->assertOk()
            ->assertJsonPath('data.0.user.name', 'Rani')
            ->assertJsonMissingPath('data.0.user.role');
    }
}
