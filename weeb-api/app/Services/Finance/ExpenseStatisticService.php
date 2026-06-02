<?php

namespace App\Services\Finance;

use App\Models\Transaction;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

class ExpenseStatisticService
{
    public function byCategory(User $user, CarbonImmutable $month): array
    {
        $start = $month->startOfMonth();
        $end = $start->addMonthNoOverflow();

        return Transaction::query()
            ->where('transactions.user_id', $user->id)
            ->where('transactions.transaction_type', 'expense')
            ->whereBetween('transaction_date', [$start, $end->subDay()])
            ->leftJoin('transaction_categories', 'transactions.category_id', '=', 'transaction_categories.id')
            ->groupBy('transactions.category_id', 'transaction_categories.name')
            ->orderByDesc('total')
            ->get([
                'transactions.category_id',
                'transaction_categories.name as category_name',
                DB::raw('sum(transactions.amount) as total'),
                DB::raw('count(*) as transaction_count'),
            ])
            ->map(fn ($row) => [
                'category_id' => $row->category_id,
                'category_name' => $row->category_name ?: 'Tanpa kategori',
                'total' => round((float) $row->total, 2),
                'transaction_count' => (int) $row->transaction_count,
            ])
            ->all();
    }
}
