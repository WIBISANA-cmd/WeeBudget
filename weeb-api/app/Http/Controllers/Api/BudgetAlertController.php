<?php

namespace App\Http\Controllers\Api;

use App\Http\Concerns\RespondsWithApi;
use App\Http\Controllers\Controller;
use App\Services\Finance\BudgetAlertService;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BudgetAlertController extends Controller
{
    use RespondsWithApi;

    public function __invoke(Request $request, BudgetAlertService $service): JsonResponse
    {
        $month = CarbonImmutable::parse($request->query('month', now()->toDateString()))->startOfMonth();

        return $this->success($service->overspending($request->user(), $month), 'Budget alerts loaded.');
    }
}
