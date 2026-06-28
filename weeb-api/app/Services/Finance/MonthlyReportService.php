<?php

namespace App\Services\Finance;

use App\Models\MonthlyReport;
use App\Models\Transaction;
use App\Models\User;
use Carbon\CarbonImmutable;

class MonthlyReportService
{
    public function __construct(private readonly HealthScoreService $healthScoreService)
    {
    }

    public function generate(User $user, CarbonImmutable $month): MonthlyReport
    {
        $start = $month->startOfMonth();
        $end = $start->addMonthNoOverflow();

        $baseQuery = Transaction::query()
            ->where('user_id', $user->id)
            ->whereBetween('transaction_date', [$start, $end->subDay()])
            ->where(fn ($query) => $query->whereNull('source')->orWhere('source', '!=', 'account_allocation'));

        $income = (float) (clone $baseQuery)
            ->where('transaction_type', 'income')
            ->sum('amount');
        $expense = (float) (clone $baseQuery)
            ->where('transaction_type', 'expense')
            ->sum('amount');
        $saving = (float) (clone $baseQuery)
            ->where('transaction_type', 'expense')
            ->where('need_type', 'saving')
            ->sum('amount');
        $health = $this->healthScoreService->calculate($user, $start);

        return MonthlyReport::query()->updateOrCreate(
            ['user_id' => $user->id, 'month' => $start->toDateString()],
            [
                'total_income' => $income,
                'total_expense' => $expense,
                'total_saving' => $saving,
                'remaining_amount' => $income - $expense,
                'financial_health_score' => $health['score'],
                'summary' => [
                    'health_label' => $health['label'],
                    'components' => $health['components'],
                ],
                'generated_at' => now(),
            ]
        );
    }
}
