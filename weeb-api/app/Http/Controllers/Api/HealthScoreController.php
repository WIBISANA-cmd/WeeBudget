<?php

namespace App\Http\Controllers\Api;

use App\Http\Concerns\RespondsWithApi;
use App\Http\Controllers\Controller;
use App\Services\Finance\HealthScoreService;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HealthScoreController extends Controller
{
    use RespondsWithApi;

    public function __invoke(Request $request, HealthScoreService $service): JsonResponse
    {
        $month = CarbonImmutable::parse($request->query('month', now()->toDateString()))->startOfMonth();

        return $this->success($service->calculate($request->user(), $month), 'Health score calculated.');
    }
}
