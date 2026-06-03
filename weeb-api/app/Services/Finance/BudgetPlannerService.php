<?php

namespace App\Services\Finance;

use App\Models\FinancialPeriod;
use App\Models\FinancialAccount;
use App\Models\Transaction;
use App\Models\User;
use Carbon\CarbonImmutable;

class BudgetPlannerService
{
    public function generate(User $user, ?float $baseAmount = null): array
    {
        $baseAmount ??= $this->availableBalance($user);
        $baseAmount = max($baseAmount, 0);

        $plans = [
            ['key' => 'needs', 'label' => 'Kebutuhan wajib', 'percent' => 55, 'description' => 'Makan, kos, kuota internet, dan kebutuhan yang tidak bisa ditunda.'],
            ['key' => 'savings', 'label' => 'Tabungan', 'percent' => 20, 'description' => 'Uang yang dipisahkan untuk tujuan jangka pendek atau rencana penting yang sudah ditentukan.'],
            ['key' => 'couple_savings', 'label' => 'Tabungan berdua', 'percent' => 5, 'description' => 'Setoran bersama pasangan untuk rencana berdua agar kontribusi tetap terlihat jelas.'],
            ['key' => 'emergency_fund', 'label' => 'Dana darurat', 'percent' => 15, 'description' => 'Cadangan khusus untuk kebutuhan mendadak agar tabungan dan uang harian tidak ikut terganggu.'],
            ['key' => 'wants', 'label' => 'Keinginan', 'percent' => 10, 'description' => 'Jajan, hiburan, nongkrong, dan wishlist yang masih bisa dikontrol atau ditunda.'],
        ];

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
            'allocated_amount' => round($allocated, 2),
            'unallocated_amount' => round($baseAmount - $allocated, 2),
            'period' => $activePeriod ? $this->periodPayload($activePeriod) : null,
            'period_source' => $activePeriod ? 'active_period' : 'payday_profile',
            'days_until_payday' => $daysUntilPayday,
            'daily_safe_from_plan' => round(floor(($baseAmount * 0.55) / max($daysUntilPayday, 1)), 2),
            'allocations' => $allocations,
            'recommendation' => $this->recommendation($baseAmount, $daysUntilPayday),
        ];
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
        $dailyNeeds = floor(($baseAmount * 0.55) / max($daysUntilPayday, 1));

        if ($dailyNeeds < 30000) {
            return 'Mode ketat: dahulukan makan, transport, dan tagihan wajib. Tunda wishlist sampai gajian.';
        }

        if ($dailyNeeds < 60000) {
            return 'Masih bisa aman, tapi pakai batas harian sebagai pagar. Kurangi jajan kecil yang sering tidak terasa.';
        }

        return 'Ritme cukup sehat. Sisihkan dulu dana darurat sebelum menaikkan budget keinginan.';
    }
}
