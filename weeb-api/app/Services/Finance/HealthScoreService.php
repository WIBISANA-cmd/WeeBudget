<?php

namespace App\Services\Finance;

use App\Models\Bill;
use App\Models\SavingGoal;
use App\Models\Transaction;
use App\Models\User;
use Carbon\CarbonImmutable;

class HealthScoreService
{
    public function __construct(private readonly PaydaySimulationService $paydaySimulationService)
    {
    }

    public function calculate(User $user, ?CarbonImmutable $month = null): array
    {
        $month ??= CarbonImmutable::today()->startOfMonth();
        $start = $month->startOfMonth();
        $end = $month->addMonthNoOverflow()->startOfMonth();

        $income = (float) Transaction::query()->where('user_id', $user->id)->where('transaction_type', 'income')->whereBetween('transaction_date', [$start, $end->subDay()])->sum('amount');
        $expense = (float) Transaction::query()->where('user_id', $user->id)->where('transaction_type', 'expense')->whereBetween('transaction_date', [$start, $end->subDay()])->sum('amount');
        $wants = (float) Transaction::query()->where('user_id', $user->id)->where('transaction_type', 'expense')->where('need_type', 'want')->whereBetween('transaction_date', [$start, $end->subDay()])->sum('amount');
        $emergencyFund = (float) SavingGoal::query()->where('user_id', $user->id)->where('type', 'emergency_fund')->where('status', 'active')->sum('current_amount');
        $activeBills = Bill::query()->where('user_id', $user->id)->where('status', 'active')->count();
        $simulation = $this->paydaySimulationService->simulate($user);

        $score = 50;
        $score += $simulation['status'] === 'safe' ? 20 : ($simulation['status'] === 'watch' ? 10 : -15);
        $score += $emergencyFund > 0 ? 15 : -10;
        $score += $income > 0 && $expense <= $income ? 15 : -10;
        $score += $income > 0 && ($wants / max($income, 1)) <= 0.15 ? 10 : -5;
        $score += $activeBills > 0 ? 5 : 0;
        $score = max(0, min(100, $score));

        return [
            'score' => $score,
            'label' => match (true) {
                $score >= 80 => 'aman',
                $score >= 60 => 'cukup_sehat',
                $score >= 40 => 'waspada',
                default => 'perlu_diketatkan',
            },
            'components' => [
                'payday_status' => $simulation['status'],
                'income' => round($income, 2),
                'expense' => round($expense, 2),
                'wants_expense' => round($wants, 2),
                'emergency_fund' => round($emergencyFund, 2),
                'active_bills' => $activeBills,
            ],
        ];
    }
}
