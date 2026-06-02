<?php

namespace App\Http\Controllers\Api;

use App\Http\Concerns\RespondsWithApi;
use App\Http\Controllers\Controller;
use App\Http\Resources\FinancialInsightResource;
use App\Models\FinancialInsight;
use App\Services\Finance\BudgetAlertService;
use App\Services\Finance\PaydaySimulationService;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InsightController extends Controller
{
    use RespondsWithApi;

    public function index(Request $request, PaydaySimulationService $payday, BudgetAlertService $budgetAlert): JsonResponse
    {
        $stored = FinancialInsight::query()
            ->where('user_id', $request->user()->id)
            ->where('status', $request->query('status', 'active'))
            ->latest()
            ->limit(20)
            ->get();

        return $this->success([
            'stored' => FinancialInsightResource::collection($stored),
            'live' => [
                'payday_simulation' => $payday->simulate($request->user()),
                'budget_alerts' => $budgetAlert->overspending($request->user(), CarbonImmutable::today()->startOfMonth()),
            ],
        ], 'Insights loaded.');
    }
}
