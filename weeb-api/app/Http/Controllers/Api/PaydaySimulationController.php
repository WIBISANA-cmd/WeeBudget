<?php

namespace App\Http\Controllers\Api;

use App\Http\Concerns\RespondsWithApi;
use App\Http\Controllers\Controller;
use App\Services\Finance\PaydaySimulationService;
use Illuminate\Http\JsonResponse;

class PaydaySimulationController extends Controller
{
    use RespondsWithApi;

    public function __invoke(PaydaySimulationService $service): JsonResponse
    {
        return $this->success($service->simulate(request()->user()), 'Payday simulation calculated.');
    }
}
