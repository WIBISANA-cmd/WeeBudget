<?php

namespace App\Http\Controllers\Api;

use App\Http\Concerns\RespondsWithApi;
use App\Http\Controllers\Controller;
use App\Http\Requests\Finance\StoreRecurringTransactionRequest;
use App\Http\Requests\Finance\UpdateRecurringTransactionRequest;
use App\Http\Resources\RecurringTransactionResource;
use App\Models\RecurringTransaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RecurringTransactionController extends Controller
{
    use RespondsWithApi;

    public function index(Request $request): JsonResponse
    {
        $query = RecurringTransaction::query()
            ->where('user_id', $request->user()->id)
            ->when($request->filled('transaction_type'), fn ($q) => $q->where('transaction_type', $request->transaction_type))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->status))
            ->orderBy('next_run_date');

        $paginator = $query->paginate($this->perPage($request, 20));

        return $this->paginated(RecurringTransactionResource::collection($paginator), $paginator, 'Recurring transactions loaded.');
    }

    public function store(StoreRecurringTransactionRequest $request): JsonResponse
    {
        $item = RecurringTransaction::query()->create([
            ...$request->validated(),
            'user_id' => $request->user()->id,
            'frequency' => $request->input('frequency', 'monthly'),
            'status' => $request->input('status', 'active'),
        ]);

        return $this->success(new RecurringTransactionResource($item), 'Recurring transaction created.', 201);
    }

    public function show(Request $request, int $recurringTransaction): JsonResponse
    {
        return $this->success(new RecurringTransactionResource($this->find($request, $recurringTransaction)), 'Recurring transaction loaded.');
    }

    public function update(UpdateRecurringTransactionRequest $request, int $recurringTransaction): JsonResponse
    {
        $item = $this->find($request, $recurringTransaction);
        $item->update($request->validated());

        return $this->success(new RecurringTransactionResource($item->fresh()), 'Recurring transaction updated.');
    }

    public function destroy(Request $request, int $recurringTransaction): JsonResponse
    {
        $this->find($request, $recurringTransaction)->delete();

        return $this->deleted('Recurring transaction deleted.');
    }

    private function find(Request $request, int $id): RecurringTransaction
    {
        return RecurringTransaction::query()->where('id', $id)->where('user_id', $request->user()->id)->firstOrFail();
    }
}
