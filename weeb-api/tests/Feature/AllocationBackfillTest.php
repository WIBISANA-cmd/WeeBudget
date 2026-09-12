<?php

namespace Tests\Feature;

use App\Models\FinancialAccount;
use App\Models\Transaction;
use App\Models\User;
use App\Services\Finance\AccountBalanceService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * The backfill runs on every dashboard read. It must stay a constant-cost no-op once allocations
 * are linked, and still repair a pair whose incoming leg went missing.
 */
class AllocationBackfillTest extends TestCase
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

    /** Three wallet → savings allocations. @return array{User, FinancialAccount} */
    private function allocations(): array
    {
        $user = User::factory()->create();
        $wallet = $this->account($user, 'Dompet Utama', 'daily_spending', 1000000);
        $savings = $this->account($user, 'Tabungan', 'savings', 0);

        foreach ([100000, 200000, 50000] as $amount) {
            app(AccountBalanceService::class)->allocateBetweenAccounts([
                'source_account_id' => $wallet->id,
                'destination_account_id' => $savings->id,
                'amount' => $amount,
                'transaction_date' => '2026-06-12',
            ], $user->id);
        }

        // The backfill filters on metadata->counterpart_account_id with string ids. Postgres' ->>
        // yields text, so production matches; SQLite's json_extract yields an integer that never
        // equals a string. Store it as text so this test takes the path Postgres takes.
        Transaction::query()->where('user_id', $user->id)->where('transaction_type', 'expense')->get()
            ->each(function (Transaction $outgoing) {
                $outgoing->metadata = [...$outgoing->metadata, 'counterpart_account_id' => (string) $outgoing->metadata['counterpart_account_id']];
                $outgoing->save();
            });

        return [$user, $savings];
    }

    public function test_linked_allocations_cost_three_queries_regardless_of_count(): void
    {
        [$user] = $this->allocations();

        $queries = 0;
        DB::listen(function () use (&$queries) {
            $queries++;
        });
        app(AccountBalanceService::class)->backfillMissingAllocationIncomeTransactions($user->id);
        $backfillQueries = $queries;

        $this->assertSame(6, Transaction::query()->where('user_id', $user->id)->count());
        // accounts + outgoing legs + one live-counterpart check. It used to lock and look up each
        // allocation in turn (5 queries here, 29 for a real user with 28 allocations).
        $this->assertSame(3, $backfillQueries);
    }

    public function test_a_missing_incoming_leg_is_recreated(): void
    {
        [$user, $savings] = $this->allocations();
        Transaction::query()->where('user_id', $user->id)->where('transaction_type', 'income')->where('amount', 200000)->delete();

        app(AccountBalanceService::class)->backfillMissingAllocationIncomeTransactions($user->id);

        $incoming = Transaction::query()->where('user_id', $user->id)->where('transaction_type', 'income')->get();
        $this->assertCount(3, $incoming);
        $recreated = $incoming->firstWhere('amount', '200000.00');
        $this->assertNotNull($recreated);
        $this->assertEquals($savings->id, $recreated->account_id);
        $this->assertTrue((bool) data_get($recreated->metadata, 'backfilled'));
    }
}
