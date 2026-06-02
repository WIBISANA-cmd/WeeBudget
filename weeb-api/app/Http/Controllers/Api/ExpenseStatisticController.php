<?php

namespace App\Http\Controllers\Api;

use App\Http\Concerns\RespondsWithApi;
use App\Http\Controllers\Controller;
use App\Services\Finance\ExpenseStatisticService;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ExpenseStatisticController extends Controller
{
    use RespondsWithApi;

    public function byCategory(Request $request, ExpenseStatisticService $service): JsonResponse
    {
        $month = CarbonImmutable::parse($request->query('month', now()->toDateString()))->startOfMonth();

        return $this->success($service->byCategory($request->user(), $month), 'Expense statistics loaded.');
    }
}
