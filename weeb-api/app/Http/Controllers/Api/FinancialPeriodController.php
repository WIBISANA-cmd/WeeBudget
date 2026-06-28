<?php

namespace App\Http\Controllers\Api;

use App\Http\Concerns\RespondsWithApi;
use App\Http\Controllers\Controller;
use App\Http\Requests\Finance\StoreFinancialPeriodRequest;
use App\Http\Requests\Finance\UpdateFinancialPeriodRequest;
use App\Http\Resources\FinancialPeriodResource;
use App\Models\FinancialPeriod;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FinancialPeriodController extends Controller
{
    use RespondsWithApi;

    public function index(Request $request): JsonResponse
    {
        $query = FinancialPeriod::query()
            ->where('user_id', $request->user()->id)
            ->when($request->filled('year'), function ($q) use ($request) {
                $year = (int) $request->integer('year');
                $q->whereDate('start_date', '>=', "{$year}-01-01")
                    ->whereDate('start_date', '<=', "{$year}-12-31");
            })
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->status))
            ->latest('start_date');

        $paginator = $query->paginate($this->perPage($request, 20));

        return $this->paginated(FinancialPeriodResource::collection($paginator), $paginator, 'Financial periods loaded.');
    }

    public function store(StoreFinancialPeriodRequest $request): JsonResponse
    {
        $period = FinancialPeriod::query()->create([
            ...$request->validated(),
            'user_id' => $request->user()->id,
            'opening_balance' => $request->input('opening_balance', 0),
            'income_target' => $request->input('income_target', 0),
            'expense_limit' => $request->input('expense_limit', 0),
            'status' => $request->input('status', 'planned'),
        ]);

        return $this->success(new FinancialPeriodResource($period), 'Financial period created.', 201);
    }

    public function show(Request $request, int $period): JsonResponse
    {
        return $this->success(new FinancialPeriodResource($this->find($request, $period)), 'Financial period loaded.');
    }

    public function update(UpdateFinancialPeriodRequest $request, int $period): JsonResponse
    {
        $model = $this->find($request, $period);
        $model->update($request->validated());

        return $this->success(new FinancialPeriodResource($model->fresh()), 'Financial period updated.');
    }

    public function destroy(Request $request, int $period): JsonResponse
    {
        $this->find($request, $period)->delete();

        return $this->deleted('Financial period deleted.');
    }

    private function find(Request $request, int $id): FinancialPeriod
    {
        return FinancialPeriod::query()
            ->where('id', $id)
            ->where('user_id', $request->user()->id)
            ->firstOrFail();
    }
}
