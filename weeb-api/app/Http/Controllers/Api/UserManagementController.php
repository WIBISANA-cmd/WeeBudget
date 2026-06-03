<?php

namespace App\Http\Controllers\Api;

use App\Http\Concerns\RespondsWithApi;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreUserRequest;
use App\Http\Requests\Admin\UpdateUserRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserManagementController extends Controller
{
    use RespondsWithApi;

    public function index(Request $request): JsonResponse
    {
        if ($response = $this->authorizeAdmin($request)) {
            return $response;
        }

        $query = User::query()
            ->when($request->filled('role'), fn ($q) => $q->where('role', $request->role))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->status))
            ->when($request->filled('search'), fn ($q) => $q->where(fn ($inner) => $inner
                ->where('name', 'like', '%'.$request->search.'%')
                ->orWhere('email', 'like', '%'.$request->search.'%')))
            ->latest('id');

        $paginator = $query->paginate($request->integer('per_page', 20));

        return $this->paginated(UserResource::collection($paginator), $paginator, 'Users loaded.');
    }

    public function store(StoreUserRequest $request): JsonResponse
    {
        if ($response = $this->authorizeAdmin($request)) {
            return $response;
        }

        $user = User::query()->create([
            ...$request->validated(),
            'email_verified_at' => now(),
        ]);

        return $this->success(new UserResource($user), 'User created.', 201);
    }

    public function show(Request $request, int $user): JsonResponse
    {
        if ($response = $this->authorizeAdmin($request)) {
            return $response;
        }

        return $this->success(new UserResource($this->find($user)), 'User loaded.');
    }

    public function update(UpdateUserRequest $request, int $user): JsonResponse
    {
        if ($response = $this->authorizeAdmin($request)) {
            return $response;
        }

        $model = $this->find($user);
        $data = $request->validated();

        if (blank($data['password'] ?? null)) {
            unset($data['password']);
        }

        $model->update($data);

        if (($model->status ?? 'active') !== 'active') {
            $model->tokens()->delete();
        }

        return $this->success(new UserResource($model->fresh()), 'User updated.');
    }

    public function destroy(Request $request, int $user): JsonResponse
    {
        if ($response = $this->authorizeAdmin($request)) {
            return $response;
        }

        if ($request->user()->id === $user) {
            return response()->json([
                'success' => false,
                'message' => 'Kamu tidak bisa menghapus akun yang sedang digunakan.',
                'data' => null,
            ], 422);
        }

        $model = $this->find($user);
        $model->tokens()->delete();
        $model->delete();

        return $this->deleted('User deleted.');
    }

    private function find(int $id): User
    {
        return User::query()->whereKey($id)->firstOrFail();
    }

    private function authorizeAdmin(Request $request): ?JsonResponse
    {
        if (($request->user()->role ?? 'user') === 'admin') {
            return null;
        }

        return response()->json([
            'success' => false,
            'message' => 'Hanya admin yang bisa mengelola user.',
            'data' => null,
        ], 403);
    }
}
