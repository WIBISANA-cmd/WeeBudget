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
        $isAdmin = ($request->user()->role ?? 'user') === 'admin';
        $forkedSourceIds = $isAdmin ? [] : TransactionCategory::query()
            ->where('user_id', $request->user()->id)
            ->whereNotNull('source_category_id')
            ->pluck('source_category_id')
            ->all();

        $query = TransactionCategory::query()
            ->with('account:id,name')
            ->when(
                ! $isAdmin,
                fn ($query) => $query->where(fn ($q) => $q->where('user_id', $request->user()->id)
                    ->orWhere(fn ($q2) => $q2->whereNull('user_id')->whereNotIn('id', $forkedSourceIds)))
            )
            ->when($request->filled('transaction_type'), fn ($q) => $q->whereIn('transaction_type', [$request->transaction_type, 'both']))
            ->when($request->filled('need_type'), fn ($q) => $q->where('need_type', $request->need_type))
            ->orderByDesc('is_default')
            ->orderBy('sort_order')
            ->orderBy('name');

        $paginator = $query->paginate($this->perPage($request, 20));

        return $this->paginated(CategoryResource::collection($paginator), $paginator, 'Categories loaded.');
    }

    public function store(StoreCategoryRequest $request): JsonResponse
    {
        $data = $request->validated();
        $isAdmin = ($request->user()->role ?? 'user') === 'admin';
        $data['user_id'] = $isAdmin ? null : $request->user()->id;
        if ($isAdmin) {
            $data['account_id'] = null;
        }
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
        $model = $this->findCategory($request, $category);
        $data = $request->validated();
        $isAdmin = ($request->user()->role ?? 'user') === 'admin';

        // Kategori global (bawaan/shared) tidak boleh diubah langsung oleh user biasa.
        // Editannya disimpan sebagai kategori pribadi (fork) milik user tersebut saja.
        if (! $isAdmin && $model->user_id === null) {
            $fork = TransactionCategory::query()
                ->where('user_id', $request->user()->id)
                ->where('source_category_id', $model->id)
                ->first();

            $forkData = array_merge($model->only(['color', 'sort_order']), $data, [
                'user_id' => $request->user()->id,
                'source_category_id' => $model->id,
                'is_default' => false,
            ]);
            $forkData['slug'] = $forkData['slug'] ?? Str::slug($forkData['name'] ?? $model->name);

            $result = $fork
                ? tap($fork)->update($forkData)
                : TransactionCategory::query()->create($forkData);

            return $this->success(new CategoryResource($result->fresh()->load('account:id,name')), 'Category updated.');
        }

        if ($isAdmin || $model->user_id === null) {
            $data['account_id'] = null;
        }
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
        $isAdmin = ($request->user()->role ?? 'user') === 'admin';

        return TransactionCategory::query()
            ->where('id', $id)
            ->where(function ($query) use ($request, $customOnly, $isAdmin) {
                if ($isAdmin) {
                    return;
                }

                if ($customOnly) {
                    $query->where('user_id', $request->user()->id);
                    return;
                }

                $query->where('user_id', $request->user()->id)->orWhereNull('user_id');
            })
            ->firstOrFail();
    }
}
