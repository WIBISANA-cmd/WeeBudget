<?php

namespace App\Http\Controllers\Api;

use App\Http\Concerns\RespondsWithApi;
use App\Http\Controllers\Controller;
use App\Http\Requests\Finance\StoreSavingGoalRequest;
use App\Http\Requests\Finance\UpdateSavingGoalRequest;
use App\Http\Resources\SavingGoalResource;
use App\Models\SavingGoal;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SavingGoalController extends Controller
{
    use RespondsWithApi;

    public function __construct(private readonly ?string $fixedType = null)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $query = SavingGoal::query()
            ->where('user_id', $request->user()->id)
            ->when($this->fixedType, fn ($q) => $q->where('type', $this->fixedType))
            ->when(! $this->fixedType && $request->filled('type'), fn ($q) => $q->where('type', $request->type))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->status))
            ->orderBy('priority')
            ->latest();

        $paginator = $query->paginate($request->integer('per_page', 20));

        return $this->paginated(SavingGoalResource::collection($paginator), $paginator, 'Saving goals loaded.');
    }

    public function store(StoreSavingGoalRequest $request): JsonResponse
    {
        $goal = SavingGoal::query()->create([
            ...$request->validated(),
            'user_id' => $request->user()->id,
            'type' => $this->fixedType ?? $request->input('type', 'saving'),
            'current_amount' => $request->input('current_amount', 0),
            'priority' => $request->input('priority', 3),
            'status' => $request->input('status', 'active'),
        ]);

        return $this->success(new SavingGoalResource($goal), 'Saving goal created.', 201);
    }

    public function show(Request $request, int $savingGoal): JsonResponse
    {
        return $this->success(new SavingGoalResource($this->find($request, $savingGoal)), 'Saving goal loaded.');
    }

    public function update(UpdateSavingGoalRequest $request, int $savingGoal): JsonResponse
    {
        $goal = $this->find($request, $savingGoal);
        $data = $request->validated();
        if ($this->fixedType) {
            unset($data['type']);
        }
        $goal->update($data);

        return $this->success(new SavingGoalResource($goal->fresh()), 'Saving goal updated.');
    }

    public function destroy(Request $request, int $savingGoal): JsonResponse
    {
        $this->find($request, $savingGoal)->delete();

        return $this->deleted('Saving goal deleted.');
    }

    protected function find(Request $request, int $id): SavingGoal
    {
        return SavingGoal::query()
            ->where('id', $id)
            ->where('user_id', $request->user()->id)
            ->when($this->fixedType, fn ($q) => $q->where('type', $this->fixedType))
            ->firstOrFail();
    }
}
