<?php

namespace App\Http\Concerns;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Pagination\LengthAwarePaginator;

trait RespondsWithApi
{
    protected function success(mixed $data = null, string $message = 'OK', int $status = 200, array $meta = []): JsonResponse
    {
        if ($data instanceof JsonResource) {
            $data = $data->resolve();
        }

        return response()->json(array_filter([
            'success' => true,
            'message' => $message,
            'data' => $data,
            'meta' => $meta ?: null,
        ], fn ($value) => $value !== null), $status);
    }

    protected function paginated(mixed $resourceCollection, LengthAwarePaginator $paginator, string $message = 'OK'): JsonResponse
    {
        return $this->success($resourceCollection, $message, 200, [
            'current_page' => $paginator->currentPage(),
            'from' => $paginator->firstItem(),
            'last_page' => $paginator->lastPage(),
            'per_page' => $paginator->perPage(),
            'to' => $paginator->lastItem(),
            'total' => $paginator->total(),
        ]);
    }

    protected function deleted(string $message = 'Deleted'): JsonResponse
    {
        return $this->success(null, $message);
    }
}
