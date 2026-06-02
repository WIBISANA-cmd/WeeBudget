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
        $month = CarbonImmutable::parse(request('month', now()->toDateString()))->startOfMonth();

        return $this->success($service->byCategory(request()->user(), $month), 'Category breakdown loaded.');
    }

    public function budgetWarnings(BudgetAlertService $service): JsonResponse
    {
        return $this->success($service->overspending(request()->user()), 'Budget warnings loaded.');
    }
}
