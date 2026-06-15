<?php

namespace App\Http\Controllers\Api;

use App\Http\Concerns\RespondsWithApi;
use App\Http\Controllers\Controller;
use App\Http\Requests\Finance\UpdateBudgetPlannerAllocationsRequest;
use App\Services\Finance\BudgetPlannerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BudgetPlannerController extends Controller
{
    use RespondsWithApi;

    public function __invoke(Request $request, BudgetPlannerService $service): JsonResponse
    {
        $validated = $request->validate([
            'base_amount' => ['nullable', 'numeric', 'min:0', 'max:999999999999.99'],
        ]);

        return $this->success(
            $service->generate($request->user(), isset($validated['base_amount']) ? (float) $validated['base_amount'] : null),
            'Budget planner generated.',
        );
    }

    public function updateAllocations(UpdateBudgetPlannerAllocationsRequest $request, BudgetPlannerService $service): JsonResponse
    {
        return $this->success(
            $service->saveAllocations($request->user(), $request->validated('allocations')),
            'Custom budget planner allocations saved.',
        );
    }
}
