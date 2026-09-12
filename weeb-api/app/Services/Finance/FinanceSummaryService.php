<?php

namespace App\Services\Finance;

use App\Models\Bill;
use App\Models\FinancialAccount;
use App\Models\Transaction;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;

class FinanceSummaryService
{
    public function __construct(
        private readonly PaydaySimulationService $paydaySimulationService,
        private readonly HealthScoreService $healthScoreService,
        private readonly ExpenseStatisticService $expenseStatisticService,
        private readonly BudgetAlertService $budgetAlertService,
        private readonly BudgetPlannerService $budgetPlannerService,
        private readonly AccountBalanceService $accountBalanceService,
    ) {
    }

    public function dashboard(User $user): array
    {
        $this->accountBalanceService->backfillMissingAllocationIncomeTransactions((int) $user->id);

        $today = CarbonImmutable::today();
        $month = $today->startOfMonth();
        $nextMonth = $month->addMonthNoOverflow();
        $periodEnd = $nextMonth->subDay();

        // Every account and month figure below is derived from these two fetches. Each query is a
        // database round trip, and this endpoint used to spend ~70 of them re-asking the same things.
        $accounts = FinancialAccount::query()
            ->where('user_id', $user->id)
            ->where('is_active', true)
            ->get(['id', 'name', 'purpose', 'current_balance']);
        // ponytail: the month is summed in PHP; fine at hundreds of rows a month, move sums to SQL at thousands.
        $monthTransactions = Transaction::query()
            ->where('user_id', $user->id)
            ->whereBetween('transaction_date', [$month, $periodEnd])
            ->get(['account_id', 'transaction_date', 'transaction_type', 'need_type', 'amount']);

        $expenses = $monthTransactions->where('transaction_type', 'expense');
        $income = (float) $monthTransactions->where('transaction_type', 'income')->sum('amount');
        $expense = (float) $expenses->sum('amount');
        // Only defined when there are active accounts: that is the case every balance helper sums them.
        $accountsTotal = $accounts->isNotEmpty() ? (float) $accounts->sum('current_balance') : null;
        $balance = $accountsTotal ?? $income - $expense;

        $payday = $this->paydaySimulationService->simulate($user, $today, $accountsTotal);
        $health = $this->healthScoreService->calculate($user, $month, $payday, [
            'income' => $income,
            'expense' => $expense,
            'wants' => (float) $expenses->where('need_type', 'want')->sum('amount'),
        ]);
        $topCategories = $this->topCategories($user, $month, $expense);
        $budgetAlerts = $this->budgetAlertService->overspending($user, $month);
        $savingBalance = $this->accountBalanceByPurpose($accounts, 'savings');
        $emergencyFundBalance = $this->accountBalanceByPurpose($accounts, 'emergency_fund');
        $accountBreakdown = $this->accountBreakdown($accounts);
        $accountBalances = $this->accountBalances($accounts, $monthTransactions);
        $focusedBalances = $this->focusedAccountBalances($accounts);
        $expenseByNeedType = $this->expenseByNeedType($expenses);
        $planner = $this->budgetPlannerService->generate($user, $accountsTotal);
        $hasAnyData = $balance > 0 || $income > 0 || $expense > 0 || $savingBalance > 0 || $emergencyFundBalance > 0;

        return [
            'is_empty' => ! $hasAnyData,
            'user' => [
                'name' => $user->name,
            ],
            'period' => [
                'month' => $month->toDateString(),
                'label' => $month->translatedFormat('F Y'),
            ],
            'status' => $payday['status'],
            'summary' => [
                'balance' => round($balance, 2),
                'income_this_month' => round($income, 2),
                'expense_this_month' => round($expense, 2),
                'remaining_this_month' => round($income - $expense, 2),
                'net_until_payday' => $payday['net_available_until_payday'],
                'daily_safe_amount' => $payday['daily_safe_amount'],
                'days_to_payday' => $payday['days_left'],
                'next_payday' => $payday['next_payday'],
            ],
            'health_score' => $health,
            'saving_goal' => $this->balanceProgress('Tabungan', $savingBalance, max($planner['base_amount'] * 0.20, 1)),
            'emergency_fund' => $this->balanceProgress('Dana darurat', $emergencyFundBalance, max($planner['base_amount'] * 0.10, 1)),
            'account_breakdown' => $accountBreakdown,
            'account_balances' => $accountBalances,
            'focused_balances' => $focusedBalances,
            'expense_by_need_type' => $expenseByNeedType,
            'budget_planner' => $planner,
            'recent_transactions' => $this->recentTransactions($user),
            'upcoming_bills' => $this->upcomingBills($user, $today),
            'top_categories' => $topCategories,
            'cashflow' => $this->weeklyCashflow($monthTransactions),
            'daily_trend' => $this->dailyTrend($user, $today),
            'budget_warnings' => $budgetAlerts['alerts'],
            'insights' => $this->insights($payday, $budgetAlerts['alerts'], $topCategories),
            'actions' => $this->actions($payday, $budgetAlerts['alerts'], $savingBalance, $emergencyFundBalance),
        ];
    }

    private function accountBalanceByPurpose(Collection $accounts, string $purpose): float
    {
        return (float) $accounts->where('purpose', $purpose)->sum('current_balance');
    }

    private function balanceProgress(string $name, float $current, float $target): array
    {
        return [
            'name' => $name,
            'current_amount' => round($current, 2),
            'target_amount' => round($target, 2),
            'progress_percent' => round(($current / max($target, 1)) * 100, 2),
        ];
    }

    private function accountBreakdown(Collection $accounts): array
    {
        $labels = [
            'daily_spending' => 'Harian',
            'salary' => 'Gaji',
            'savings' => 'Tabungan',
            'couple_savings' => 'Tabungan Berdua',
            'emergency_fund' => 'Dana Darurat',
            'bills' => 'Tagihan',
            'wishlist' => 'Wishlist',
            'investment' => 'Investasi',
            'other' => 'Lainnya',
        ];

        return $accounts
            ->groupBy('purpose')
            ->map(fn (Collection $group, $purpose) => [
                'purpose' => $purpose,
                'label' => $labels[$purpose] ?? $purpose,
                'total' => round((float) $group->sum('current_balance'), 2),
                'account_count' => $group->count(),
            ])
            ->sortByDesc('total')
            ->values()
            ->all();
    }

    private function focusedAccountBalances(Collection $accounts): array
    {
        $needAccounts = $accounts->filter(function (FinancialAccount $account) {
            $name = mb_strtolower((string) $account->name);

            return $account->purpose === 'daily_spending'
                || str_contains($name, 'kebutuhan');
        });

        $wantAccounts = $accounts->filter(function (FinancialAccount $account) {
            $name = mb_strtolower((string) $account->name);

            return $account->purpose === 'wishlist'
                || str_contains($name, 'keinginan')
                || str_contains($name, 'wishlist');
        });

        return [
            [
                'key' => 'need',
                'label' => 'Saldo Kebutuhan',
                'total' => round((float) $needAccounts->sum('current_balance'), 2),
                'account_count' => $needAccounts->count(),
            ],
            [
                'key' => 'want',
                'label' => 'Saldo Keinginan',
                'total' => round((float) $wantAccounts->sum('current_balance'), 2),
                'account_count' => $wantAccounts->count(),
            ],
        ];
    }

    private function accountBalances(Collection $accounts, Collection $monthTransactions): array
    {
        $purposeLabels = [
            'daily_spending' => 'Harian',
            'salary' => 'Gaji',
            'savings' => 'Tabungan',
            'couple_savings' => 'Tabungan Berdua',
            'emergency_fund' => 'Dana Darurat',
            'bills' => 'Tagihan',
            'wishlist' => 'Wishlist',
            'investment' => 'Investasi',
            'other' => 'Lainnya',
        ];

        $totals = $monthTransactions->groupBy('account_id');

        return $accounts->sortBy([['current_balance', 'desc'], ['name', 'asc']])->values()->map(function (FinancialAccount $account) use ($purposeLabels, $totals) {
            $accountTransactions = $totals->get($account->id, new Collection());
            $income = (float) $accountTransactions->where('transaction_type', 'income')->sum('amount');
            $expense = (float) $accountTransactions->where('transaction_type', 'expense')->sum('amount');

            return [
                'id' => $account->id,
                'name' => $account->name,
                'purpose' => $account->purpose,
                'purpose_label' => $purposeLabels[$account->purpose] ?? 'Lainnya',
                'balance' => round((float) $account->current_balance, 2),
                'income' => round($income, 2),
                'expense' => round($expense, 2),
                'net' => round($income - $expense, 2),
            ];
        })->all();
    }

    private function expenseByNeedType(Collection $expenses): array
    {
        return [
            [
                'key' => 'need',
                'label' => 'Kebutuhan',
                'amount' => round((float) $expenses->where('need_type', 'need')->sum('amount'), 2),
            ],
            [
                'key' => 'want',
                'label' => 'Keinginan',
                'amount' => round((float) $expenses->where('need_type', 'want')->sum('amount'), 2),
            ],
        ];
    }

    private function recentTransactions(User $user): array
    {
        return Transaction::query()
            ->with(['category', 'account'])
            ->where('user_id', $user->id)
            ->latest('transaction_date')
            ->latest('id')
            ->limit(6)
            ->get()
            ->map(fn (Transaction $transaction) => [
                'id' => $transaction->id,
                'description' => $transaction->description ?: $transaction->category?->name ?: 'Transaksi',
                'amount' => round((float) $transaction->amount, 2),
                'transaction_type' => $transaction->transaction_type,
                'transaction_date' => $transaction->transaction_date?->toDateString(),
                'category_name' => $transaction->category?->name,
                'account_name' => $transaction->account?->name,
            ])
            ->all();
    }

    private function upcomingBills(User $user, CarbonImmutable $today): array
    {
        return Bill::query()
            ->where('user_id', $user->id)
            ->where('status', 'active')
            ->whereNotNull('next_due_date')
            ->orderBy('next_due_date')
            ->limit(5)
            ->get(['id', 'name', 'amount_estimate', 'next_due_date'])
            ->map(function (Bill $bill) use ($today) {
                $dueDate = CarbonImmutable::parse($bill->next_due_date);
                $daysLeft = $today->diffInDays($dueDate, false);

                return [
                    'id' => $bill->id,
                    'name' => $bill->name,
                    'amount' => round((float) $bill->amount_estimate, 2),
                    'due_date' => $dueDate->toDateString(),
                    'due_label' => $this->dueLabel($daysLeft),
                    'days_left' => $daysLeft,
                    'status' => $daysLeft <= 1 ? 'urgent' : ($daysLeft <= 3 ? 'watch' : 'safe'),
                ];
            })
            ->all();
    }

    private function topCategories(User $user, CarbonImmutable $month, float $totalExpense): array
    {
        return collect($this->expenseStatisticService->byCategory($user, $month))
            ->take(5)
            ->map(fn (array $category) => [
                'category_id' => $category['category_id'],
                'name' => $category['category_name'],
                'amount' => $category['total'],
                'transaction_count' => $category['transaction_count'],
                'percent' => $totalExpense > 0 ? round(($category['total'] / $totalExpense) * 100, 2) : 0,
            ])
            ->values()
            ->all();
    }

    private function weeklyCashflow(Collection $transactions): array
    {
        return collect(range(1, 5))->map(function (int $week) use ($transactions) {
            $weekTransactions = $transactions->filter(fn (Transaction $transaction) => (int) ceil($transaction->transaction_date->day / 7) === $week);

            return [
                'week' => 'M'.$week,
                'income' => round((float) $weekTransactions->where('transaction_type', 'income')->sum('amount'), 2),
                'expense' => round((float) $weekTransactions->where('transaction_type', 'expense')->sum('amount'), 2),
            ];
        })->all();
    }

    private function dailyTrend(User $user, CarbonImmutable $today): array
    {
        $start = $today->subDays(6);
        $transactions = Transaction::query()
            ->where('user_id', $user->id)
            ->where('transaction_type', 'expense')
            ->whereBetween('transaction_date', [$start, $today])
            ->get(['transaction_date', 'amount']);

        return collect(range(0, 6))->map(function (int $offset) use ($start, $transactions) {
            $date = $start->addDays($offset);
            $amount = $transactions
                ->filter(fn (Transaction $transaction) => $transaction->transaction_date->toDateString() === $date->toDateString())
                ->sum('amount');

            return [
                'date' => $date->toDateString(),
                'day' => $date->translatedFormat('D'),
                'amount' => round((float) $amount, 2),
            ];
        })->all();
    }

    private function insights(array $payday, array $budgetAlerts, array $topCategories): array
    {
        $insights = [];

        if ($payday['status'] === 'danger') {
            $insights[] = 'Uang sampai gajian sedang ketat. Amankan makan, transport, dan tagihan wajib dulu.';
        } elseif ($payday['status'] === 'tight') {
            $insights[] = 'Masih bisa bertahan sampai gajian, tapi batasi pengeluaran fleksibel beberapa hari ini.';
        } else {
            $insights[] = 'Kondisi masih terkendali. Jaga pengeluaran harian di sekitar batas aman.';
        }

        if ($budgetAlerts !== []) {
            $category = $budgetAlerts[0]['category_name'] ?? 'salah satu kategori';
            $insights[] = "Budget {$category} mulai bocor. Kurangi transaksi kecil yang tidak wajib hari ini.";
        } elseif ($topCategories !== []) {
            $category = $topCategories[0]['name'];
            $insights[] = "Pengeluaran terbesar bulan ini ada di {$category}. Cek apakah masih sesuai kebutuhan.";
        }

        return $insights;
    }

    private function actions(array $payday, array $budgetAlerts, float $savingBalance, float $emergencyFundBalance): array
    {
        $actions = [];

        if ($payday['daily_safe_amount'] > 0) {
            $actions[] = 'Gunakan batas aman harian sebagai patokan belanja hari ini.';
        }

        if ($budgetAlerts !== []) {
            $actions[] = 'Tahan dulu pengeluaran di kategori yang melewati budget.';
        }

        if ($emergencyFundBalance <= 0) {
            $actions[] = 'Sisihkan nominal kecil untuk dana darurat jika masih ada sisa hari ini.';
        } elseif ($savingBalance <= 0) {
            $actions[] = 'Tambahkan sedikit ke target tabungan agar progres tetap jalan.';
        } else {
            $actions[] = 'Catat pengeluaran berikutnya supaya simulasi tetap akurat.';
        }

        return array_values(array_unique($actions));
    }

    private function dueLabel(int $daysLeft): string
    {
        return match (true) {
            $daysLeft < 0 => 'Terlambat',
            $daysLeft === 0 => 'Hari ini',
            $daysLeft === 1 => 'Besok',
            default => "{$daysLeft} hari lagi",
        };
    }
}
