<?php

namespace Tests\Feature;

use App\Models\FinancialPeriod;
use App\Models\User;
use App\Services\Finance\BudgetPlannerService;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BudgetPlannerActivePeriodTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        CarbonImmutable::setTestNow();

        parent::tearDown();
    }

    public function test_budget_planner_uses_active_period_from_period_management(): void
    {
        CarbonImmutable::setTestNow('2026-06-10');

        $user = User::factory()->create();
        $period = FinancialPeriod::query()->create([
            'user_id' => $user->id,
            'name' => 'Juni 2026',
            'start_date' => '2026-06-01',
            'end_date' => '2026-06-30',
            'payday_date' => '2026-06-25',
            'status' => 'active',
        ]);

        $planner = app(BudgetPlannerService::class)->generate($user, 3000000);

        $this->assertSame('active_period', $planner['period_source']);
        $this->assertSame($period->id, $planner['period']['id']);
        $this->assertSame('Juni 2026', $planner['period']['name']);
        $this->assertSame(21, $planner['days_until_payday']);
        $this->assertSame(78571.0, $planner['daily_safe_from_plan']);
    }

    public function test_budget_planner_falls_back_to_payday_profile_when_no_active_period_exists(): void
    {
        CarbonImmutable::setTestNow('2026-06-10');

        $user = User::factory()->create();

        $planner = app(BudgetPlannerService::class)->generate($user, 3000000);

        $this->assertSame('payday_profile', $planner['period_source']);
        $this->assertNull($planner['period']);
        $this->assertSame(15, $planner['days_until_payday']);
    }

    public function test_budget_planner_uses_current_savings_allocation_percentages(): void
    {
        $user = User::factory()->create();

        $allocations = collect(app(BudgetPlannerService::class)->generate($user, 1000000)['allocations'])
            ->keyBy('key');

        $this->assertSame(5, $allocations['couple_savings']['percent']);
        $this->assertSame(50000.0, $allocations['couple_savings']['amount']);
        $this->assertSame(15, $allocations['emergency_fund']['percent']);
        $this->assertSame(150000.0, $allocations['emergency_fund']['amount']);
    }

    public function test_budget_planner_uses_full_active_period_days_when_today_is_outside_period(): void
    {
        CarbonImmutable::setTestNow('2026-06-10');

        $user = User::factory()->create();
        FinancialPeriod::query()->create([
            'user_id' => $user->id,
            'name' => 'Juli 2026',
            'start_date' => '2026-07-01',
            'end_date' => '2026-07-31',
            'payday_date' => '2026-07-25',
            'status' => 'active',
        ]);

        $planner = app(BudgetPlannerService::class)->generate($user, 3100000);

        $this->assertSame('active_period', $planner['period_source']);
        $this->assertSame(31, $planner['days_until_payday']);
        $this->assertSame(55000.0, $planner['daily_safe_from_plan']);
    }
}
