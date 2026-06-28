<?php

namespace App\Http\Controllers\Api;

use App\Http\Concerns\RespondsWithApi;
use App\Http\Controllers\Controller;
use App\Http\Requests\Finance\StoreBillRequest;
use App\Http\Requests\Finance\UpdateBillRequest;
use App\Http\Resources\BillResource;
use App\Models\Bill;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BillController extends Controller
{
    use RespondsWithApi;

    public function index(Request $request): JsonResponse
    {
        $query = Bill::query()
            ->where('user_id', $request->user()->id)
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->status))
            ->orderBy('next_due_date');

        $paginator = $query->paginate($this->perPage($request, 20));

        return $this->paginated(BillResource::collection($paginator), $paginator, 'Bills loaded.');
    }

    public function store(StoreBillRequest $request): JsonResponse
    {
        $bill = Bill::query()->create([
            ...$request->validated(),
            'user_id' => $request->user()->id,
            'frequency' => $request->input('frequency', 'monthly'),
            'status' => $request->input('status', 'active'),
        ]);

        return $this->success(new BillResource($bill), 'Bill created.', 201);
    }

    public function show(Request $request, int $bill): JsonResponse
    {
        return $this->success(new BillResource($this->find($request, $bill)), 'Bill loaded.');
    }

    public function update(UpdateBillRequest $request, int $bill): JsonResponse
    {
        $model = $this->find($request, $bill);
        $model->update($request->validated());

        return $this->success(new BillResource($model->fresh()), 'Bill updated.');
    }

    public function destroy(Request $request, int $bill): JsonResponse
    {
        $this->find($request, $bill)->delete();

        return $this->deleted('Bill deleted.');
    }

    private function find(Request $request, int $id): Bill
    {
        return Bill::query()->where('id', $id)->where('user_id', $request->user()->id)->firstOrFail();
    }
}
