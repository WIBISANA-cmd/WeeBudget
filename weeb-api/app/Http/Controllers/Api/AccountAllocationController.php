<?php

namespace App\Http\Controllers\Api;

use App\Http\Concerns\RespondsWithApi;
use App\Http\Controllers\Controller;
use App\Http\Requests\Finance\StoreAccountAllocationRequest;
use App\Services\Finance\AccountBalanceService;
use Illuminate\Http\JsonResponse;

class AccountAllocationController extends Controller
{
    use RespondsWithApi;

    public function store(StoreAccountAllocationRequest $request, AccountBalanceService $balanceService): JsonResponse
    {
        $result = $balanceService->allocateBetweenAccounts($request->validated(), $request->user()->id);

        return $this->success($result, 'Account allocation completed.', 201);
    }
}
