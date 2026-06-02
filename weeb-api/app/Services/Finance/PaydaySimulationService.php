<?php

namespace App\Services\Finance;

use App\Models\Bill;
use App\Models\FinancialAccount;
use App\Models\Transaction;
use App\Models\User;
use Carbon\CarbonImmutable;

class PaydaySimulationService
{
    public function simulate(User $user, ?CarbonImmutable $today = null): array
    {
        $today ??= CarbonImmutable::today();
        $profile = $user->profile()->first();
        $nextPayday = $this->nextPayday($profile?->payday_day, $today);
        $daysLeft = max($today->diffInDays($nextPayday), 1);

        $activeAccountCount = FinancialAccount::query()
            ->where('user_id', $user->id)
            ->where('is_active', true)
            ->count();
        $availableBalance = $activeAccountCount > 0
            ? (float) FinancialAccount::query()
                ->where('user_id', $user->id)
                ->where('is_active', true)
                ->sum('current_balance')
            : $this->estimatedBalanceFromTransactions($user, $today);

        $upcomingBills = (float) Bill::query()
            ->where('user_id', $user->id)
            ->where('status', 'active')
            ->whereNotNull('next_due_date')
            ->whereDate('next_due_date', '<=', $nextPayday)
            ->sum('amount_estimate');

        $netAvailable = $availableBalance - $upcomingBills;
        $dailySafeAmount = floor(max($netAvailable, 0) / $daysLeft);

        return [
            'today' => $today->toDateString(),
            'next_payday' => $nextPayday->toDateString(),
            'days_left' => $daysLeft,
            'available_balance' => round($availableBalance, 2),
            'upcoming_bills_until_payday' => round($upcomingBills, 2),
            'net_available_until_payday' => round($netAvailable, 2),
            'daily_safe_amount' => round($dailySafeAmount, 2),
            'status' => $this->status($dailySafeAmount, $netAvailable),
        ];
    }

    private function nextPayday(?int $paydayDay, CarbonImmutable $today): CarbonImmutable
    {
        $day = min(max($paydayDay ?: 25, 1), 31);
        $candidate = $today->setDay(min($day, $today->daysInMonth));

        if ($candidate->lessThanOrEqualTo($today)) {
            $nextMonth = $today->addMonthNoOverflow();
            return $nextMonth->setDay(min($day, $nextMonth->daysInMonth));
        }

        return $candidate;
    }

    private function status(float $dailySafeAmount, float $netAvailable): string
    {
        if ($netAvailable < 0) {
            return 'danger';
        }

        return match (true) {
            $dailySafeAmount >= 75000 => 'safe',
            $dailySafeAmount >= 40000 => 'watch',
            $dailySafeAmount >= 20000 => 'tight',
            default => 'danger',
        };
    }

    private function estimatedBalanceFromTransactions(User $user, CarbonImmutable $today): float
    {
        $start = $today->startOfMonth();

        $income = (float) Transaction::query()
            ->where('user_id', $user->id)
            ->where('transaction_type', 'income')
            ->whereBetween('transaction_date', [$start, $today])
            ->sum('amount');

        $expense = (float) Transaction::query()
            ->where('user_id', $user->id)
            ->where('transaction_type', 'expense')
            ->whereBetween('transaction_date', [$start, $today])
            ->sum('amount');

        return $income - $expense;
    }
}
