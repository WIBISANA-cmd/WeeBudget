<?php

namespace App\Services\Finance;

use App\Models\Budget;
use App\Models\Transaction;
use App\Models\User;
use Carbon\CarbonImmutable;

class BudgetAlertService
{
    public function overspending(User $user, ?CarbonImmutable $month = null): array
    {
        $month ??= CarbonImmutable::today()->startOfMonth();
        $budget = Budget::query()
            ->where('user_id', $user->id)
            ->whereDate('month', $month->startOfMonth())
            ->with('categories.category')
            ->first();

        if (! $budget) {
            return ['has_budget' => false, 'alerts' => []];
        }

        $start = $month->startOfMonth();
        $end = $start->addMonthNoOverflow();

        $alerts = $budget->categories->map(function ($budgetCategory) use ($user, $start, $end) {
            $spent = (float) Transaction::query()
                ->where('user_id', $user->id)
                ->where('transaction_type', 'expense')
                ->where('category_id', $budgetCategory->category_id)
                ->whereBetween('transaction_date', [$start, $end->subDay()])
                ->sum('amount');

            $allocated = (float) $budgetCategory->allocated_amount;
            $percent = $allocated > 0 ? round(($spent / $allocated) * 100, 2) : 0;

            return [
                'category_id' => $budgetCategory->category_id,
                'category_name' => $budgetCategory->category?->name,
                'allocated_amount' => $allocated,
                'spent_amount' => round($spent, 2),
                'remaining_amount' => round($allocated - $spent, 2),
                'usage_percent' => $percent,
                'status' => $percent >= 100 ? 'exceeded' : ($percent >= 80 ? 'warning' : 'safe'),
            ];
        })->filter(fn ($item) => $item['status'] !== 'safe')->values()->all();

        return ['has_budget' => true, 'budget_id' => $budget->id, 'alerts' => $alerts];
    }
}
