<?php

namespace App\Services\Finance;

use App\Models\FinancialPeriod;
use App\Models\FinancialAccount;
use App\Models\Transaction;
use App\Models\User;
use Carbon\CarbonImmutable;

class BudgetPlannerService
{
    private const DEFAULT_COUPLE_PLANS = [
        ['key' => 'needs', 'label' => 'Kebutuhan wajib', 'percent' => 50],
        ['key' => 'savings', 'label' => 'Tabungan', 'percent' => 20],
        ['key' => 'couple_savings', 'label' => 'Tabungan berdua', 'percent' => 5],
        ['key' => 'emergency_fund', 'label' => 'Dana darurat', 'percent' => 15],
        ['key' => 'wants', 'label' => 'Keinginan', 'percent' => 10],
    ];

    private const DEFAULT_PERSONAL_PLANS = [
        ['key' => 'needs', 'label' => 'Kebutuhan wajib', 'percent' => 50],
        ['key' => 'savings', 'label' => 'Tabungan', 'percent' => 20],
        ['key' => 'emergency_fund', 'label' => 'Dana darurat', 'percent' => 15],
        ['key' => 'wants', 'label' => 'Keinginan', 'percent' => 15],
    ];

    public function generate(User $user, ?float $baseAmount = null): array
    {
        $baseAmount ??= $this->availableBalance($user);
        $baseAmount = max($baseAmount, 0);

        $plans = $this->plansWithOverrides($user);

        $allocated = 0;
        $allocations = collect($plans)->map(function (array $plan) use ($baseAmount, &$allocated) {
            $amount = floor($baseAmount * $plan['percent'] / 100);
            $allocated += $amount;

            return [
                ...$plan,
                'amount' => round($amount, 2),
            ];
        })->all();

        $activePeriod = $this->activePeriod($user);
        $daysUntilPayday = $activePeriod
            ? $this->daysRemainingInPeriod($activePeriod)
            : $this->daysUntilPayday($user);

        return [
            'base_amount' => round($baseAmount, 2),
            'saved_base_amount' => round($this->savedBaseAmount($user), 2),
            'allocated_amount' => round($allocated, 2),
            'unallocated_amount' => round($baseAmount - $allocated, 2),
            'period' => $activePeriod ? $this->periodPayload($activePeriod) : null,
            'period_source' => $activePeriod ? 'active_period' : 'payday_profile',
            'days_until_payday' => $daysUntilPayday,
            'daily_safe_from_plan' => round(floor(($baseAmount * 0.50) / max($daysUntilPayday, 1)), 2),
            'allocations' => $allocations,
            'has_custom_allocations' => ! empty($user->profile?->budget_planner_allocations),
            'recommendation' => $this->recommendation($baseAmount, $daysUntilPayday),
        ];
    }

    public function saveAllocations(User $user, array $allocations, ?float $baseAmount = null): array
    {
        $profile = $user->profile()->firstOrCreate([], [
            'currency' => 'IDR',
            'timezone' => 'Asia/Jakarta',
            'payday_frequency' => 'monthly',
        ]);

        $allowedKeys = collect($this->plansForUser($user))->pluck('key')->all();
        $normalized = collect($allocations)
            ->filter(fn (array $allocation) => in_array($allocation['key'], $allowedKeys, true))
            ->map(fn (array $allocation) => [
                'key' => $allocation['key'],
                'percent' => round((float) $allocation['percent'], 2),
            ])
            ->values();

        $totalPercent = round($normalized->sum(fn (array $allocation) => (float) $allocation['percent']), 2);
        if (abs($totalPercent - 100) >= 0.001) {
            abort(422, 'Total persentase custom alokasi harus tepat 100%.');
        }

        $profile->budget_planner_allocations = $normalized->all();
        $profile->budget_planner_base_amount = $baseAmount !== null ? max($baseAmount, 0) : $profile->budget_planner_base_amount;
        $profile->save();

        return $this->generate($user->fresh('profile'));
    }

    private function availableBalance(User $user): float
    {
        $accountCount = FinancialAccount::query()
            ->where('user_id', $user->id)
            ->where('is_active', true)
            ->count();

        if ($accountCount > 0) {
            return (float) FinancialAccount::query()
                ->where('user_id', $user->id)
                ->where('is_active', true)
                ->sum('current_balance');
        }

        $month = CarbonImmutable::today()->startOfMonth();
        $today = CarbonImmutable::today();
        $income = (float) Transaction::query()->where('user_id', $user->id)->where('transaction_type', 'income')->whereBetween('transaction_date', [$month, $today])->sum('amount');
        $expense = (float) Transaction::query()->where('user_id', $user->id)->where('transaction_type', 'expense')->whereBetween('transaction_date', [$month, $today])->sum('amount');

        return $income - $expense;
    }

    private function activePeriod(User $user): ?FinancialPeriod
    {
        $today = CarbonImmutable::today();
        $activePeriods = FinancialPeriod::query()
            ->where('user_id', $user->id)
            ->where('status', 'active')
            ->orderBy('start_date')
            ->get();

        return $activePeriods->first(fn (FinancialPeriod $period) => $this->dateIsInsidePeriod($today, $period))
            ?? $activePeriods->first(fn (FinancialPeriod $period) => $period->start_date && $period->start_date->greaterThan($today))
            ?? $activePeriods->sortByDesc('end_date')->first();
    }

    private function dateIsInsidePeriod(CarbonImmutable $date, FinancialPeriod $period): bool
    {
        if (! $period->start_date || ! $period->end_date) {
            return false;
        }

        return $date->betweenIncluded(
            CarbonImmutable::parse($period->start_date),
            CarbonImmutable::parse($period->end_date),
        );
    }

    private function daysRemainingInPeriod(FinancialPeriod $period): int
    {
        $today = CarbonImmutable::today();
        $startDate = CarbonImmutable::parse($period->start_date);
        $endDate = CarbonImmutable::parse($period->end_date);

        if (! $today->betweenIncluded($startDate, $endDate)) {
            return max($startDate->diffInDays($endDate) + 1, 1);
        }

        return max($today->diffInDays($endDate, false) + 1, 1);
    }

    private function daysUntilPayday(User $user): int
    {
        $today = CarbonImmutable::today();
        $paydayDay = min(max($user->profile?->payday_day ?: 25, 1), 31);
        $candidate = $today->setDay(min($paydayDay, $today->daysInMonth));

        if ($candidate->lessThanOrEqualTo($today)) {
            $nextMonth = $today->addMonthNoOverflow();
            $candidate = $nextMonth->setDay(min($paydayDay, $nextMonth->daysInMonth));
        }

        return max($today->diffInDays($candidate), 1);
    }

    private function periodPayload(FinancialPeriod $period): array
    {
        return [
            'id' => $period->id,
            'name' => $period->name,
            'start_date' => $period->start_date?->toDateString(),
            'end_date' => $period->end_date?->toDateString(),
            'payday_date' => $period->payday_date?->toDateString(),
            'status' => $period->status,
        ];
    }

    private function recommendation(float $baseAmount, int $daysUntilPayday): string
    {
        $dailyNeeds = floor(($baseAmount * 0.50) / max($daysUntilPayday, 1));

        if ($dailyNeeds < 30000) {
            return 'Mode ketat: dahulukan makan, transport, dan tagihan wajib. Tunda wishlist sampai gajian.';
        }

        if ($dailyNeeds < 60000) {
            return 'Masih bisa aman, tapi pakai batas harian sebagai pagar. Kurangi jajan kecil yang sering tidak terasa.';
        }

        return 'Ritme cukup sehat. Sisihkan dulu dana darurat sebelum menaikkan budget keinginan.';
    }

    private function savedBaseAmount(User $user): float
    {
        return (float) ($user->profile?->budget_planner_base_amount ?? 0);
    }

    private function plansWithOverrides(User $user): array
    {
        $overrides = collect($user->profile?->budget_planner_allocations ?? [])
            ->keyBy('key');

        return collect($this->plansForUser($user))->map(function (array $plan) use ($overrides) {
            $overridePercent = $overrides->get($plan['key'])['percent'] ?? null;

            return [
                ...$plan,
                'percent' => $overridePercent !== null ? (float) $overridePercent : $plan['percent'],
            ];
        })->all();
    }

    private function plansForUser(User $user): array
    {
        $mode = $user->profile?->account_mode ?? 'couple';

        return $mode === 'personal' ? self::DEFAULT_PERSONAL_PLANS : self::DEFAULT_COUPLE_PLANS;
    }
}
