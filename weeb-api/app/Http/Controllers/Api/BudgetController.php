<?php

namespace App\Http\Controllers\Api;

use App\Http\Concerns\RespondsWithApi;
use App\Http\Controllers\Controller;
use App\Http\Requests\Finance\StoreBudgetRequest;
use App\Http\Requests\Finance\UpdateBudgetRequest;
use App\Http\Resources\BudgetResource;
use App\Models\Budget;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BudgetController extends Controller
{
    use RespondsWithApi;

    public function index(Request $request): JsonResponse
    {
        $query = Budget::query()
            ->with('categories.category')
            ->where('user_id', $request->user()->id)
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->status))
            ->latest('month');

        $paginator = $query->paginate($this->perPage($request, 12));

        return $this->paginated(BudgetResource::collection($paginator), $paginator, 'Budgets loaded.');
    }

    public function store(StoreBudgetRequest $request): JsonResponse
    {
        $budget = DB::transaction(function () use ($request) {
            $data = $request->safe()->except('categories');
            $budget = Budget::query()->create([
                ...$data,
                'user_id' => $request->user()->id,
                'planned_income' => $data['planned_income'] ?? 0,
                'planned_expense' => $data['planned_expense'] ?? 0,
                'status' => $data['status'] ?? 'active',
            ]);
            $this->syncCategories($budget, $request->input('categories', []));

            return $budget;
        });

        return $this->success(new BudgetResource($budget->load('categories.category')), 'Budget created.', 201);
    }

    public function show(Request $request, int $budget): JsonResponse
    {
        return $this->success(new BudgetResource($this->find($request, $budget)->load('categories.category')), 'Budget loaded.');
    }

    public function update(UpdateBudgetRequest $request, int $budget): JsonResponse
    {
        $model = DB::transaction(function () use ($request, $budget) {
            $model = $this->find($request, $budget);
            $model->update($request->safe()->except('categories'));
            if ($request->has('categories')) {
                $this->syncCategories($model, $request->input('categories', []));
            }

            return $model;
        });

        return $this->success(new BudgetResource($model->fresh()->load('categories.category')), 'Budget updated.');
    }

    public function destroy(Request $request, int $budget): JsonResponse
    {
        $this->find($request, $budget)->delete();

        return $this->deleted('Budget deleted.');
    }

    private function find(Request $request, int $id): Budget
    {
        return Budget::query()->where('id', $id)->where('user_id', $request->user()->id)->firstOrFail();
    }

    private function syncCategories(Budget $budget, array $categories): void
    {
        $budget->categories()->delete();
        foreach ($categories as $category) {
            $budget->categories()->create([
                'category_id' => $category['category_id'],
                'allocated_amount' => $category['allocated_amount'],
                'allocation_percent' => $category['allocation_percent'] ?? null,
            ]);
        }
    }
}
