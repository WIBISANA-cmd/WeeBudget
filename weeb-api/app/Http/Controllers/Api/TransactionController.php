<?php

namespace App\Http\Controllers\Api;

use App\Http\Concerns\RespondsWithApi;
use App\Http\Controllers\Controller;
use App\Http\Requests\Finance\StoreTransactionRequest;
use App\Http\Requests\Finance\UpdateTransactionRequest;
use App\Http\Resources\TransactionResource;
use App\Models\FinancialAccount;
use App\Models\Transaction;
use App\Services\Finance\AccountBalanceService;
use App\Services\Finance\CoupleSavingsAccessService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TransactionController extends Controller
{
    use RespondsWithApi;

    public function __construct(private readonly string $type = 'expense')
    {
    }

    public function index(Request $request, CoupleSavingsAccessService $coupleAccess): JsonResponse
    {
        $userIds = $request->input('account_purpose') === 'couple_savings'
            ? $coupleAccess->accountOwnerIdsFor($request->user())
            : [(int) $request->user()->id];

        $query = Transaction::query()
            ->with(['category', 'account'])
            ->whereIn('user_id', $userIds)
            ->where('transaction_type', $this->type)
            ->when($request->filled('account_purpose'), fn ($q) => $q->whereHas('account', fn ($account) => $account->where('purpose', $request->account_purpose)))
            ->when($request->filled('category_id'), fn ($q) => $q->where('category_id', $request->category_id))
            ->when($request->filled('need_type'), fn ($q) => $q->where('need_type', $request->need_type))
            ->when($request->filled('date_from'), fn ($q) => $q->whereDate('transaction_date', '>=', $request->date_from))
            ->when($request->filled('date_to'), fn ($q) => $q->whereDate('transaction_date', '<=', $request->date_to))
            ->latest('transaction_date')
            ->latest('id');

        $paginator = $query->paginate($this->perPage($request, 20));

        return $this->paginated(TransactionResource::collection($paginator), $paginator, ucfirst($this->type).' transactions loaded.');
    }

    public function store(StoreTransactionRequest $request, AccountBalanceService $balanceService): JsonResponse
    {
        $transaction = $balanceService->createTransaction(
            data: $this->withAutomaticSource($request->validated(), $request),
            userId: $request->user()->id,
            forcedType: $this->type,
        );

        return $this->success(new TransactionResource($transaction->load(['category', 'account'])), ucfirst($this->type).' created.', 201);
    }

    public function show(Request $request, int $transaction): JsonResponse
    {
        return $this->success(new TransactionResource($this->find($request, $transaction)->load(['category', 'account'])), ucfirst($this->type).' loaded.');
    }

    public function update(UpdateTransactionRequest $request, int $transaction, AccountBalanceService $balanceService): JsonResponse
    {
        $model = $this->find($request, $transaction);
        $model = $balanceService->updateTransaction(
            transaction: $model,
            data: $this->withAutomaticSource($request->validated(), $request),
            userId: $request->user()->id,
            forcedType: $this->type,
        );

        return $this->success(new TransactionResource($model->load(['category', 'account'])), ucfirst($this->type).' updated.');
    }

    public function destroy(Request $request, int $transaction, AccountBalanceService $balanceService): JsonResponse
    {
        $balanceService->deleteTransaction($this->find($request, $transaction), $request->user()->id);

        return $this->deleted(ucfirst($this->type).' deleted.');
    }

    private function find(Request $request, int $id): Transaction
    {
        return Transaction::query()
            ->where('id', $id)
            ->where('user_id', $request->user()->id)
            ->where('transaction_type', $this->type)
            ->firstOrFail();
    }

    private function withAutomaticSource(array $data, Request $request): array
    {
        if (! isset($data['account_id'])) {
            return $data;
        }

        $account = FinancialAccount::query()->find($data['account_id']);
        $isCoupleSavings = $account?->purpose === 'couple_savings'
            && app(CoupleSavingsAccessService::class)->canAccessAccount($account, $request->user());

        if ($isCoupleSavings) {
            $data['source'] = $request->user()->email ?: $request->user()->name;
        }

        return $data;
    }
}
