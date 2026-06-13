<?php

namespace App\Http\Controllers\Api;

use App\Http\Concerns\RespondsWithApi;
use App\Http\Controllers\Controller;
use App\Http\Requests\Finance\StoreCategoryRequest;
use App\Http\Requests\Finance\UpdateCategoryRequest;
use App\Http\Resources\CategoryResource;
use App\Models\TransactionCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CategoryController extends Controller
{
    use RespondsWithApi;

    public function index(Request $request): JsonResponse
    {
        $query = TransactionCategory::query()
            ->with('account:id,name')
            ->where(fn ($q) => $q->where('user_id', $request->user()->id)->orWhereNull('user_id'))
            ->when($request->filled('transaction_type'), fn ($q) => $q->whereIn('transaction_type', [$request->transaction_type, 'both']))
            ->when($request->filled('need_type'), fn ($q) => $q->where('need_type', $request->need_type))
            ->orderByDesc('is_default')
            ->orderBy('sort_order')
            ->orderBy('name');

        $paginator = $query->paginate($request->integer('per_page', 20));

        return $this->paginated(CategoryResource::collection($paginator), $paginator, 'Categories loaded.');
    }

    public function store(StoreCategoryRequest $request): JsonResponse
    {
        $data = $request->validated();
        $data['user_id'] = $request->user()->id;
        $data['slug'] = $data['slug'] ?? Str::slug($data['name']);
        $data['is_default'] = false;

        $category = TransactionCategory::query()->create($data);

        return $this->success(new CategoryResource($category->load('account:id,name')), 'Category created.', 201);
    }

    public function show(Request $request, int $category): JsonResponse
    {
        return $this->success(new CategoryResource($this->findCategory($request, $category)->load('account:id,name')), 'Category loaded.');
    }

    public function update(UpdateCategoryRequest $request, int $category): JsonResponse
    {
        $model = $this->findCategory($request, $category, customOnly: true);
        $data = $request->validated();
        $data['slug'] = $data['slug'] ?? (isset($data['name']) ? Str::slug($data['name']) : $model->slug);
        $model->update($data);

        return $this->success(new CategoryResource($model->fresh()->load('account:id,name')), 'Category updated.');
    }

    public function destroy(Request $request, int $category): JsonResponse
    {
        $this->findCategory($request, $category, customOnly: true)->delete();

        return $this->deleted('Category deleted.');
    }

    private function findCategory(Request $request, int $id, bool $customOnly = false): TransactionCategory
    {
        return TransactionCategory::query()
            ->where('id', $id)
            ->where(fn ($q) => $customOnly ? $q->where('user_id', $request->user()->id) : $q->where('user_id', $request->user()->id)->orWhereNull('user_id'))
            ->firstOrFail();
    }
}
