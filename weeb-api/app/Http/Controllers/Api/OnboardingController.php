<?php

namespace App\Http\Controllers\Api;

use App\Http\Concerns\RespondsWithApi;
use App\Http\Controllers\Controller;
use App\Http\Requests\Profile\StoreOnboardingRequest;
use App\Http\Resources\UserResource;
use App\Models\SavingGoal;
use Illuminate\Http\JsonResponse;

class OnboardingController extends Controller
{
    use RespondsWithApi;

    public function show(): JsonResponse
    {
        $user = request()->user()->load('profile');

        return $this->success([
            'completed' => (bool) $user->profile?->onboarding_completed_at,
            'user' => new UserResource($user),
        ], 'Onboarding status loaded.');
    }

    public function store(StoreOnboardingRequest $request): JsonResponse
    {
        $user = $request->user();
        $data = $request->validated();

        $user->update(['name' => $data['name']]);
        $user->profile()->updateOrCreate(
            ['user_id' => $user->id],
            [
                'monthly_income_estimate' => $data['monthly_income_estimate'],
                'payday_day' => $data['payday_day'],
                'daily_safe_amount_target' => $data['daily_safe_amount_target'] ?? null,
                'onboarding_completed_at' => now()->toDateString(),
            ],
        );

        if (! empty($data['saving_goal_name']) && ! empty($data['saving_goal_target'])) {
            SavingGoal::query()->firstOrCreate(
                ['user_id' => $user->id, 'type' => 'saving', 'name' => $data['saving_goal_name']],
                ['target_amount' => $data['saving_goal_target'], 'current_amount' => 0, 'priority' => 2, 'status' => 'active'],
            );
        }

        if (! empty($data['emergency_fund_target'])) {
            SavingGoal::query()->firstOrCreate(
                ['user_id' => $user->id, 'type' => 'emergency_fund'],
                ['name' => 'Dana darurat', 'target_amount' => $data['emergency_fund_target'], 'current_amount' => 0, 'priority' => 1, 'status' => 'active'],
            );
        }

        return $this->success(new UserResource($user->fresh()->load('profile')), 'Onboarding saved.');
    }
}
