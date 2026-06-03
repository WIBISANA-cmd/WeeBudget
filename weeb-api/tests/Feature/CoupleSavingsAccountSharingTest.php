<?php

namespace Tests\Feature;

use App\Models\CoupleSavingsSetting;
use App\Models\FinancialAccount;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CoupleSavingsAccountSharingTest extends TestCase
{
    use RefreshDatabase;

    public function test_partner_can_see_the_same_couple_savings_account(): void
    {
        [$partnerOne, $partnerTwo] = $this->partners();
        $account = $this->account($partnerOne);

        $this->withToken($partnerTwo->createToken('test')->plainTextToken)
            ->getJson('/api/accounts?purpose=couple_savings&is_active=true')
            ->assertOk()
            ->assertJsonPath('data.0.id', $account->id);
    }

    public function test_partner_can_see_shared_couple_savings_account_in_account_management(): void
    {
        [$partnerOne, $partnerTwo] = $this->partners();
        $sharedAccount = $this->account($partnerOne);
        $privateAccount = $this->account($partnerOne, purpose: 'daily_spending');

        $response = $this->withToken($partnerTwo->createToken('test')->plainTextToken)
            ->getJson('/api/accounts')
            ->assertOk();

        $accountIds = collect($response->json('data'))->pluck('id');

        $this->assertTrue($accountIds->contains($sharedAccount->id));
        $this->assertFalse($accountIds->contains($privateAccount->id));
    }

    public function test_partner_can_deposit_to_shared_couple_savings_account(): void
    {
        [$partnerOne, $partnerTwo] = $this->partners();
        $account = $this->account($partnerOne, currentBalance: 100000);

        $this->withToken($partnerTwo->createToken('test')->plainTextToken)
            ->postJson('/api/transactions', [
                'transaction_type' => 'income',
                'account_id' => $account->id,
                'amount' => 50000,
                'need_type' => 'saving',
                'transaction_date' => '2026-06-03',
                'description' => 'Setoran pasangan 2',
            ])
            ->assertCreated()
            ->assertJsonPath('data.source', $partnerTwo->email);

        $this->assertSame('150000.00', $account->fresh()->current_balance);
    }

    public function test_couple_savings_transactions_include_both_partners(): void
    {
        [$partnerOne, $partnerTwo] = $this->partners();
        $account = $this->account($partnerOne);

        foreach ([$partnerOne, $partnerTwo] as $partner) {
            $this->withToken($partner->createToken('test')->plainTextToken)
                ->postJson('/api/transactions', [
                    'transaction_type' => 'income',
                    'account_id' => $account->id,
                    'amount' => 25000,
                    'need_type' => 'saving',
                    'transaction_date' => '2026-06-03',
                    'description' => 'Setoran '.$partner->name,
                ])
                ->assertCreated();
        }

        $this->withToken($partnerTwo->createToken('test')->plainTextToken)
            ->getJson('/api/transactions?transaction_type=income&need_type=saving&account_purpose=couple_savings')
            ->assertOk()
            ->assertJsonCount(2, 'data');
    }

    public function test_partner_cannot_use_other_private_account(): void
    {
        [$partnerOne, $partnerTwo] = $this->partners();
        $account = $this->account($partnerOne, purpose: 'daily_spending');

        $this->withToken($partnerTwo->createToken('test')->plainTextToken)
            ->postJson('/api/transactions', [
                'transaction_type' => 'income',
                'account_id' => $account->id,
                'amount' => 50000,
                'transaction_date' => '2026-06-03',
                'description' => 'Tidak boleh',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('account_id');
    }

    private function partners(): array
    {
        $partnerOne = User::factory()->create(['status' => 'active']);
        $partnerTwo = User::factory()->create(['status' => 'active']);

        CoupleSavingsSetting::query()->create([
            'partner_one_user_id' => $partnerOne->id,
            'partner_two_user_id' => $partnerTwo->id,
        ]);

        return [$partnerOne, $partnerTwo];
    }

    private function account(User $user, string $purpose = 'couple_savings', float $currentBalance = 0): FinancialAccount
    {
        return FinancialAccount::query()->create([
            'user_id' => $user->id,
            'name' => 'Tabungan Berdua',
            'type' => 'bank',
            'purpose' => $purpose,
            'opening_balance' => $currentBalance,
            'current_balance' => $currentBalance,
            'is_default' => false,
            'is_active' => true,
        ]);
    }
}
