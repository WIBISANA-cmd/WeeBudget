<?php

namespace App\Http\Controllers\Api;

use App\Http\Concerns\RespondsWithApi;
use App\Http\Controllers\Controller;
use App\Http\Requests\Finance\StoreWishlistRequest;
use App\Http\Requests\Finance\UpdateWishlistRequest;
use App\Http\Resources\WishlistResource;
use App\Models\Wishlist;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WishlistController extends Controller
{
    use RespondsWithApi;

    public function index(Request $request): JsonResponse
    {
        $query = Wishlist::query()
            ->where('user_id', $request->user()->id)
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->status))
            ->when($request->filled('need_type'), fn ($q) => $q->where('need_type', $request->need_type))
            ->latest();

        $paginator = $query->paginate($request->integer('per_page', 20));

        return $this->paginated(WishlistResource::collection($paginator), $paginator, 'Wishlist loaded.');
    }

    public function store(StoreWishlistRequest $request): JsonResponse
    {
        $item = Wishlist::query()->create([
            ...$request->validated(),
            'user_id' => $request->user()->id,
            'need_type' => $request->input('need_type', 'want'),
            'waiting_days' => $request->input('waiting_days', 7),
            'status' => $request->input('status', 'waiting'),
        ]);

        return $this->success(new WishlistResource($item), 'Wishlist item created.', 201);
    }

    public function show(Request $request, int $wishlist): JsonResponse
    {
        return $this->success(new WishlistResource($this->find($request, $wishlist)), 'Wishlist item loaded.');
    }

    public function update(UpdateWishlistRequest $request, int $wishlist): JsonResponse
    {
        $item = $this->find($request, $wishlist);
        $item->update($request->validated());

        return $this->success(new WishlistResource($item->fresh()), 'Wishlist item updated.');
    }

    public function destroy(Request $request, int $wishlist): JsonResponse
    {
        $this->find($request, $wishlist)->delete();

        return $this->deleted('Wishlist item deleted.');
    }

    private function find(Request $request, int $id): Wishlist
    {
        return Wishlist::query()->where('id', $id)->where('user_id', $request->user()->id)->firstOrFail();
    }
}
