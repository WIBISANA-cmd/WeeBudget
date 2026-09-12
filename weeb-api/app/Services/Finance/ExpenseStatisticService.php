<?php

namespace App\Services\Finance;

use App\Models\Transaction;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

class ExpenseStatisticService
{
    /** Without an end date the range is the whole month $start falls in. */
    public function byCategory(User $user, CarbonImmutable $start, ?CarbonImmutable $end = null): array
    {
        $from = $start->startOfDay();
        $to = ($end ?? $start->endOfMonth())->endOfDay();

        return Transaction::query()
            ->where('transactions.user_id', $user->id)
            ->where('transactions.transaction_type', 'expense')
            ->whereBetween('transaction_date', [$from, $to])
            ->countedInReports()
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

    /**
     * The rows behind one slice of byCategory(). Same scope and range, so the amounts listed
     * add up to the slice. A null category is the 'Tanpa kategori' slice.
     */
    public function transactionsInCategory(User $user, CarbonImmutable $start, ?CarbonImmutable $end, ?int $categoryId, int $limit = 100): array
    {
        $from = $start->startOfDay();
        $to = ($end ?? $start->endOfMonth())->endOfDay();

        return Transaction::query()
            ->with('account:id,name')
            ->where('user_id', $user->id)
            ->where('transaction_type', 'expense')
            ->whereBetween('transaction_date', [$from, $to])
            ->when(
                $categoryId,
                fn ($query) => $query->where('category_id', $categoryId),
                fn ($query) => $query->whereNull('category_id'),
            )
            ->countedInReports()
            ->orderByDesc('transaction_date')
            ->orderByDesc('id')
            ->limit($limit)
            ->get()
            ->map(fn (Transaction $transaction) => [
                'id' => $transaction->id,
                'transaction_date' => $transaction->transaction_date?->toDateString(),
                'description' => $transaction->description,
                'amount' => round((float) $transaction->amount, 2),
                'need_type' => $transaction->need_type,
                'account_name' => $transaction->account?->name,
            ])
            ->all();
    }
}
