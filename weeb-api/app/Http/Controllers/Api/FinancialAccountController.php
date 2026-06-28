<?php

namespace App\Http\Controllers\Api;

use App\Http\Concerns\RespondsWithApi;
use App\Http\Controllers\Controller;
use App\Http\Requests\Finance\StoreFinancialAccountRequest;
use App\Http\Requests\Finance\UpdateFinancialAccountRequest;
use App\Http\Resources\FinancialAccountResource;
use App\Models\FinancialAccount;
use App\Services\Finance\CoupleSavingsAccessService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FinancialAccountController extends Controller
{
    use RespondsWithApi;

    public function index(Request $request, CoupleSavingsAccessService $coupleAccess): JsonResponse
    {
        $query = FinancialAccount::query()
            ->where(function ($query) use ($request, $coupleAccess) {
                $query->where('user_id', $request->user()->id);

                if ($coupleAccess->canShareCoupleSavings($request->user())) {
                    $query->orWhere(function ($shared) use ($request, $coupleAccess) {
                        $shared
                            ->where('purpose', 'couple_savings')
                            ->whereIn('user_id', $coupleAccess->accountOwnerIdsFor($request->user()));
                    });
                }
            })
            ->when($request->filled('purpose'), fn ($q) => $q->where('purpose', $request->purpose))
            ->when($request->filled('type'), fn ($q) => $q->where('type', $request->type))
            ->when($request->filled('is_active'), fn ($q) => $q->where('is_active', $request->boolean('is_active')))
            ->orderByDesc('is_default')
            ->orderByDesc('is_active')
            ->orderBy('purpose')
            ->orderBy('name');

        $paginator = $query->paginate($this->perPage($request, 20));

        return $this->paginated(FinancialAccountResource::collection($paginator), $paginator, 'Financial accounts loaded.');
    }

    public function store(StoreFinancialAccountRequest $request): JsonResponse
    {
        $account = DB::transaction(function () use ($request) {
            $data = $this->payload($request->validated(), $request->user()->id);

            if ($data['is_default']) {
                $this->clearDefaultAccount($data['user_id']);
            }

            return FinancialAccount::query()->create($data);
        });

        return $this->success(new FinancialAccountResource($account), 'Financial account created.', 201);
    }

    public function show(Request $request, int $account): JsonResponse
    {
        return $this->success(new FinancialAccountResource($this->find($request, $account)), 'Financial account loaded.');
    }

    public function update(UpdateFinancialAccountRequest $request, int $account): JsonResponse
    {
        $model = $this->find($request, $account);

        DB::transaction(function () use ($request, $model) {
            $data = $this->payload($request->validated(), $request->user()->id, $model);

            if (($data['is_default'] ?? false) === true) {
                $this->clearDefaultAccount($data['user_id'], exceptId: $model->id);
            }

            $model->update($data);
        });

        return $this->success(new FinancialAccountResource($model->fresh()), 'Financial account updated.');
    }

    public function destroy(Request $request, int $account): JsonResponse
    {
        $this->find($request, $account)->delete();

        return $this->deleted('Financial account deleted.');
    }

    private function find(Request $request, int $id): FinancialAccount
    {
        $account = FinancialAccount::query()
            ->where('id', $id)
            ->firstOrFail();

        if (! app(CoupleSavingsAccessService::class)->canAccessAccount($account, $request->user())) {
            abort(404);
        }

        return $account;
    }

    private function payload(array $data, int $userId, ?FinancialAccount $existing = null): array
    {
        $openingBalance = $data['opening_balance'] ?? $existing?->opening_balance ?? 0;

        return [
            'user_id' => $existing?->user_id ?? $userId,
            'name' => $data['name'] ?? $existing?->name,
            'type' => $data['type'] ?? $existing?->type ?? 'cash',
            'purpose' => $data['purpose'] ?? $existing?->purpose ?? 'daily_spending',
            'institution_name' => $data['institution_name'] ?? $existing?->institution_name,
            'account_identifier' => $data['account_identifier'] ?? $existing?->account_identifier,
            'opening_balance' => $openingBalance,
            'current_balance' => $data['current_balance'] ?? $existing?->current_balance ?? $openingBalance,
            'is_default' => $data['is_default'] ?? $existing?->is_default ?? false,
            'is_active' => $data['is_active'] ?? $existing?->is_active ?? true,
            'notes' => $data['notes'] ?? $existing?->notes,
        ];
    }

    private function clearDefaultAccount(int $userId, ?int $exceptId = null): void
    {
        FinancialAccount::query()
            ->where('user_id', $userId)
            ->when($exceptId, fn ($q) => $q->whereKeyNot($exceptId))
            ->update(['is_default' => false]);
    }
}
