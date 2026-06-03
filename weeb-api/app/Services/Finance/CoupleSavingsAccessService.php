<?php

namespace App\Services\Finance;

use App\Models\CoupleSavingsSetting;
use App\Models\FinancialAccount;
use App\Models\User;

class CoupleSavingsAccessService
{
    public function accountOwnerIdsFor(User $user): array
    {
        $partnerIds = $this->partnerIds();

        if ($partnerIds === []) {
            return [(int) $user->id];
        }

        if ($this->isAdmin($user) || in_array((int) $user->id, $partnerIds, true)) {
            return $partnerIds;
        }

        return [(int) $user->id];
    }

    public function canAccessAccount(FinancialAccount $account, User $user): bool
    {
        if ((int) $account->user_id === (int) $user->id) {
            return true;
        }

        return $account->purpose === 'couple_savings'
            && in_array((int) $account->user_id, $this->accountOwnerIdsFor($user), true);
    }

    public function canAccessAccountByUserId(FinancialAccount $account, int $userId): bool
    {
        if ((int) $account->user_id === $userId) {
            return true;
        }

        $user = User::query()->find($userId);

        return $user !== null && $this->canAccessAccount($account, $user);
    }

    public function canShareCoupleSavings(User $user): bool
    {
        $partnerIds = $this->partnerIds();

        return $partnerIds !== []
            && ($this->isAdmin($user) || in_array((int) $user->id, $partnerIds, true));
    }

    private function partnerIds(): array
    {
        $setting = CoupleSavingsSetting::query()->first();

        return collect([
            $setting?->partner_one_user_id,
            $setting?->partner_two_user_id,
        ])
            ->filter()
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values()
            ->all();
    }

    private function isAdmin(User $user): bool
    {
        return ($user->role ?? 'user') === 'admin';
    }
}
