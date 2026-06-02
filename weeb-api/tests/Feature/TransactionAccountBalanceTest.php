<?php

namespace Tests\Feature;

use App\Models\FinancialAccount;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TransactionAccountBalanceTest extends TestCase
{
    use RefreshDatabase;

    public function test_income_transaction_adds_balance_to_selected_account(): void
    {
        $user = User::factory()->create();
        $account = $this->account($user, currentBalance: 100000);

        $this->withToken($user->createToken('test')->plainTextToken)
            ->postJson('/api/transactions', [
                'transaction_type' => 'income',
                'account_id' => $account->id,
                'amount' => 25000,
                'transaction_date' => '2026-06-02',
                'description' => 'Gaji tambahan',
            ])
            ->assertCreated();

        $this->assertSame('125000.00', $account->fresh()->current_balance);
    }

    public function test_expense_transaction_subtracts_balance_from_selected_account(): void
    {
        $user = User::factory()->create();
        $account = $this->account($user, currentBalance: 100000);

        $this->withToken($user->createToken('test')->plainTextToken)
            ->postJson('/api/transactions', [
                'transaction_type' => 'expense',
                'account_id' => $account->id,
                'amount' => 30000,
                'need_type' => 'need',
                'transaction_date' => '2026-06-02',
                'description' => 'Belanja wajib',
            ])
            ->assertCreated();

        $this->assertSame('70000.00', $account->fresh()->current_balance);
    }

    public function test_updating_transaction_reverses_old_account_effect_and_applies_new_effect(): void
    {
        $user = User::factory()->create();
        $sourceAccount = $this->account($user, name: 'Dompet', currentBalance: 100000);
        $targetAccount = $this->account($user, name: 'Bank', currentBalance: 50000);

        $token = $user->createToken('test')->plainTextToken;

        $transactionId = $this->withToken($token)
            ->postJson('/api/transactions', [
                'transaction_type' => 'expense',
                'account_id' => $sourceAccount->id,
                'amount' => 20000,
                'need_type' => 'need',
                'transaction_date' => '2026-06-02',
                'description' => 'Transaksi awal',
            ])
            ->assertCreated()
            ->json('data.id');

        $this->withToken($token)
            ->putJson("/api/transactions/{$transactionId}", [
                'transaction_type' => 'income',
                'account_id' => $targetAccount->id,
                'amount' => 40000,
                'need_type' => null,
                'transaction_date' => '2026-06-02',
                'description' => 'Transaksi diperbarui',
            ])
            ->assertOk();

        $this->assertSame('100000.00', $sourceAccount->fresh()->current_balance);
        $this->assertSame('90000.00', $targetAccount->fresh()->current_balance);
    }

    public function test_deleting_transaction_reverses_balance_effect(): void
    {
        $user = User::factory()->create();
        $account = $this->account($user, currentBalance: 100000);

        $token = $user->createToken('test')->plainTextToken;

        $transactionId = $this->withToken($token)
            ->postJson('/api/transactions', [
                'transaction_type' => 'expense',
                'account_id' => $account->id,
                'amount' => 15000,
                'need_type' => 'want',
                'transaction_date' => '2026-06-02',
                'description' => 'Keinginan',
            ])
            ->assertCreated()
            ->json('data.id');

        $this->assertSame('85000.00', $account->fresh()->current_balance);

        $this->withToken($token)
            ->deleteJson("/api/transactions/{$transactionId}")
            ->assertOk();

        $this->assertSame('100000.00', $account->fresh()->current_balance);
    }

    public function test_transaction_requires_selected_account(): void
    {
        $user = User::factory()->create();

        $this->withToken($user->createToken('test')->plainTextToken)
            ->postJson('/api/transactions', [
                'transaction_type' => 'income',
                'amount' => 25000,
                'transaction_date' => '2026-06-02',
                'description' => 'Tanpa rekening',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('account_id');
    }

    private function account(User $user, string $name = 'Rekening', float $currentBalance = 0): FinancialAccount
    {
        return FinancialAccount::query()->create([
            'user_id' => $user->id,
            'name' => $name,
            'type' => 'cash',
            'purpose' => 'daily_spending',
            'opening_balance' => $currentBalance,
            'current_balance' => $currentBalance,
            'is_default' => false,
            'is_active' => true,
        ]);
    }
}
