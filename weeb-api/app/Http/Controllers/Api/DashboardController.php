<?php

namespace App\Http\Controllers\Api;

use App\Http\Concerns\RespondsWithApi;
use App\Http\Controllers\Controller;
use App\Services\Finance\BudgetAlertService;
use App\Services\Finance\ExpenseStatisticService;
use App\Services\Finance\FinanceSummaryService;
use App\Services\Finance\HealthScoreService;
use App\Services\Finance\PaydaySimulationService;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;

class DashboardController extends Controller
{
    use RespondsWithApi;

    public function __invoke(FinanceSummaryService $service): JsonResponse
    {
        return $this->success($service->dashboard(request()->user()), 'Dashboard loaded.');
    }

    public function healthScore(HealthScoreService $service): JsonResponse
    {
        return $this->success($service->calculate(request()->user()), 'Health score calculated.');
    }

    public function insights(FinanceSummaryService $service): JsonResponse
    {
        $dashboard = $service->dashboard(request()->user());

        return $this->success([
            'health_score' => $dashboard['health_score'],
            'insights' => $dashboard['insights'],
            'budget_warnings' => $dashboard['budget_warnings'],
        ], 'Dashboard insights loaded.');
    }

    public function cashflowPreview(FinanceSummaryService $service): JsonResponse
    {
        $dashboard = $service->dashboard(request()->user());

        return $this->success([
            'cashflow' => $dashboard['cashflow'],
            'daily_trend' => $dashboard['daily_trend'],
        ], 'Cashflow preview loaded.');
    }

    public function categoryBreakdown(ExpenseStatisticService $service): JsonResponse
    {
        [$start, $end] = $this->breakdownRange();

        return $this->success($service->byCategory(request()->user(), $start, $end), 'Category breakdown loaded.');
    }

    /** The transactions behind one slice of the breakdown; no category_id means 'Tanpa kategori'. */
    public function categoryBreakdownTransactions(ExpenseStatisticService $service): JsonResponse
    {
        $categoryId = request()->validate(['category_id' => ['nullable', 'integer']])['category_id'] ?? null;
        [$start, $end] = $this->breakdownRange();

        return $this->success(
            $service->transactionsInCategory(request()->user(), $start, $end, $categoryId ? (int) $categoryId : null),
            'Category transactions loaded.',
        );
    }

    /** @return array{0: CarbonImmutable, 1: ?CarbonImmutable} */
    private function breakdownRange(): array
    {
        $validated = request()->validate([
            'month' => ['nullable', 'date'],
            'start' => ['nullable', 'date'],
            'end' => ['nullable', 'date'],
        ]);

        // start/end is the reports range; month (or nothing) keeps the whole-month behaviour.
        return [
            isset($validated['start'])
                ? CarbonImmutable::parse($validated['start'])
                : CarbonImmutable::parse($validated['month'] ?? now()->toDateString())->startOfMonth(),
            isset($validated['end']) ? CarbonImmutable::parse($validated['end']) : null,
        ];
    }

    public function budgetWarnings(BudgetAlertService $service): JsonResponse
    {
        return $this->success($service->overspending(request()->user()), 'Budget warnings loaded.');
    }
}
