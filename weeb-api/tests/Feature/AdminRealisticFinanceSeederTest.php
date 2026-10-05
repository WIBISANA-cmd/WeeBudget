<?php

namespace Tests\Feature;

use App\Models\FinancialAccount;
use App\Models\Transaction;
use App\Models\User;
use App\Services\Finance\FinanceSummaryService;
use Database\Seeders\AdminRealisticFinanceSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class AdminRealisticFinanceSeederTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->travelTo('2026-10-05 10:30:00');
        $this->admin = User::factory()->create(['email' => 'admin@weebudget.com', 'role' => 'admin']);
        $this->seed(AdminRealisticFinanceSeeder::class);
    }

    public function test_account_balances_match_opening_balance_plus_transactions(): void
    {
        foreach (FinancialAccount::query()->where('user_id', $this->admin->id)->get() as $account) {
            $signed = Transaction::query()->where('account_id', $account->id)->get()
                ->sum(fn (Transaction $transaction) => $transaction->transaction_type === 'income' ? (float) $transaction->amount : -(float) $transaction->amount);

            $this->assertEqualsWithDelta((float) $account->opening_balance + $signed, (float) $account->current_balance, 0.001, $account->name);
        }
    }

    public function test_no_account_is_ever_overdrawn(): void
    {
        $running = FinancialAccount::query()->where('user_id', $this->admin->id)->pluck('opening_balance', 'id')->map(fn ($value) => (float) $value)->all();

        // Ids follow the order the rows were written, which is the order money actually moved.
        foreach (Transaction::query()->where('user_id', $this->admin->id)->orderBy('id')->get() as $transaction) {
            $running[$transaction->account_id] += $transaction->transaction_type === 'income' ? (float) $transaction->amount : -(float) $transaction->amount;

            $this->assertGreaterThanOrEqual(0, $running[$transaction->account_id], "#{$transaction->id} {$transaction->description} on {$transaction->transaction_date->toDateString()}");
        }
    }

    public function test_allocations_are_paired_legs(): void
    {
        $legs = Transaction::query()->where('user_id', $this->admin->id)->where('source', 'account_allocation')->get();

        $this->assertGreaterThan(0, $legs->count());
        $this->assertSame(0, $legs->count() % 2);

        foreach ($legs as $leg) {
            $counterpart = $legs->firstWhere('id', data_get($leg->metadata, 'counterpart_transaction_id'));

            $this->assertNotNull($counterpart, "#{$leg->id} has no counterpart");
            $this->assertSame($leg->amount, $counterpart->amount);
            $this->assertSame($leg->id, data_get($counterpart->metadata, 'counterpart_transaction_id'));
            $this->assertNotSame($leg->transaction_type, $counterpart->transaction_type);
            $this->assertSame($leg->user_id, data_get($leg->metadata, 'actor_user_id'));
        }
    }

    public function test_history_spans_six_payday_cycles_and_stays_in_the_past(): void
    {
        $dates = Transaction::query()->where('user_id', $this->admin->id)->pluck('transaction_date');

        $this->assertSame('2026-03-25', $dates->min()->toDateString());
        $this->assertLessThanOrEqual('2026-10-05', $dates->max()->toDateString());
        $this->assertGreaterThan(800, $dates->count());

        // The running cycle starts on the latest payday and already holds its salary.
        $this->assertTrue(Transaction::query()->where('user_id', $this->admin->id)->where('description', 'Gaji September 2026')->whereDate('transaction_date', '2026-09-25')->exists());
    }

    public function test_savings_goals_add_up_to_their_accounts(): void
    {
        $goalTotals = DB::table('saving_goals')->where('user_id', $this->admin->id)->selectRaw('type, sum(current_amount) as total')->groupBy('type')->pluck('total', 'type');
        $balances = FinancialAccount::query()->where('user_id', $this->admin->id)->pluck('current_balance', 'purpose');

        $this->assertEqualsWithDelta((float) $balances['emergency_fund'], (float) $goalTotals['emergency_fund'], 0.001);
        $this->assertEqualsWithDelta((float) $balances['savings'], (float) $goalTotals['saving'], 0.001);
    }

    public function test_every_bill_has_a_payment_trail_and_a_next_due_date(): void
    {
        $bills = DB::table('bills')->where('user_id', $this->admin->id)->get();

        $this->assertCount(5, $bills);
        foreach ($bills as $bill) {
            $this->assertNotNull($bill->next_due_date);
            $this->assertGreaterThanOrEqual(6, DB::table('bill_payments')->where('bill_id', $bill->id)->where('status', '!=', 'unpaid')->count());
            $this->assertSame(0, DB::table('bill_payments')->where('bill_id', $bill->id)->where('status', 'paid')->whereNull('transaction_id')->count());
        }
    }

    public function test_dashboard_builds_from_the_seeded_data(): void
    {
        $dashboard = app(FinanceSummaryService::class)->dashboard($this->admin->fresh('profile'));

        $this->assertFalse($dashboard['is_empty']);
        $this->assertEquals(20, $dashboard['summary']['days_to_payday']);
        $this->assertSame('2026-10-25', $dashboard['summary']['next_payday']);
        $this->assertGreaterThan(0, $dashboard['summary']['balance']);
        $this->assertNotEmpty($dashboard['recent_transactions']);
    }

    public function test_running_it_again_rebuilds_instead_of_duplicating(): void
    {
        $before = Transaction::query()->where('user_id', $this->admin->id)->count();
        $balances = FinancialAccount::query()->where('user_id', $this->admin->id)->pluck('current_balance', 'name')->all();

        $this->seed(AdminRealisticFinanceSeeder::class);

        $this->assertSame($before, Transaction::query()->where('user_id', $this->admin->id)->count());
        $this->assertSame($balances, FinancialAccount::query()->where('user_id', $this->admin->id)->pluck('current_balance', 'name')->all());
        $this->assertSame(7, FinancialAccount::query()->where('user_id', $this->admin->id)->count());
    }
}
