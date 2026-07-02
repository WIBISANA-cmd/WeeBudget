<?php

namespace App\Services\Finance;

use App\Models\Bill;
use App\Models\FinancialAccount;
use App\Models\Transaction;
use App\Models\User;
use Carbon\CarbonImmutable;

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

        $income = $this->sumTransactions($user, 'income', $month, $periodEnd);
        $expense = $this->sumTransactions($user, 'expense', $month, $periodEnd);
        $activeAccountCount = FinancialAccount::query()
            ->where('user_id', $user->id)
            ->where('is_active', true)
            ->count();
        $balance = $activeAccountCount > 0
            ? (float) FinancialAccount::query()
                ->where('user_id', $user->id)
                ->where('is_active', true)
                ->sum('current_balance')
            : $income - $expense;

        $payday = $this->paydaySimulationService->simulate($user, $today);
        $health = $this->healthScoreService->calculate($user, $month);
        $topCategories = $this->topCategories($user, $month, $expense);
        $budgetAlerts = $this->budgetAlertService->overspending($user, $month);
        $savingBalance = $this->accountBalanceByPurpose($user, 'savings');
        $emergencyFundBalance = $this->accountBalanceByPurpose($user, 'emergency_fund');
        $accountBreakdown = $this->accountBreakdown($user);
        $accountBalances = $this->accountBalances($user, $month, $periodEnd);
        $focusedBalances = $this->focusedAccountBalances($user);
        $expenseByNeedType = $this->expenseByNeedType($user, $month, $periodEnd);
        $planner = $this->budgetPlannerService->generate($user);
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
            'cashflow' => $this->weeklyCashflow($user, $month, $periodEnd),
            'daily_trend' => $this->dailyTrend($user, $today),
            'budget_warnings' => $budgetAlerts['alerts'],
            'insights' => $this->insights($payday, $budgetAlerts['alerts'], $topCategories),
            'actions' => $this->actions($payday, $budgetAlerts['alerts'], $savingBalance, $emergencyFundBalance),
        ];
    }

    private function accountBalanceByPurpose(User $user, string $purpose): float
    {
        return (float) FinancialAccount::query()
            ->where('user_id', $user->id)
            ->where('is_active', true)
            ->where('purpose', $purpose)
            ->sum('current_balance');
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

    private function accountBreakdown(User $user): array
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

        return FinancialAccount::query()
            ->where('user_id', $user->id)
            ->where('is_active', true)
            ->selectRaw('purpose, sum(current_balance) as total, count(*) as account_count')
            ->groupBy('purpose')
            ->orderByDesc('total')
            ->get()
            ->map(fn ($row) => [
                'purpose' => $row->purpose,
                'label' => $labels[$row->purpose] ?? $row->purpose,
                'total' => round((float) $row->total, 2),
                'account_count' => (int) $row->account_count,
            ])
            ->all();
    }

    private function focusedAccountBalances(User $user): array
    {
        $accounts = FinancialAccount::query()
            ->where('user_id', $user->id)
            ->where('is_active', true)
            ->get(['id', 'name', 'purpose', 'current_balance']);

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

    private function accountBalances(User $user, CarbonImmutable $start, CarbonImmutable $end): array
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

        $accounts = FinancialAccount::query()
            ->where('user_id', $user->id)
            ->where('is_active', true)
            ->orderByDesc('current_balance')
            ->orderBy('name')
            ->get(['id', 'name', 'purpose', 'current_balance']);

        $totals = Transaction::query()
            ->where('user_id', $user->id)
            ->whereIn('account_id', $accounts->pluck('id'))
            ->whereBetween('transaction_date', [$start, $end])
            ->selectRaw("
                account_id,
                SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE 0 END) as income_total,
                SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END) as expense_total
            ")
            ->groupBy('account_id')
            ->get()
            ->keyBy('account_id');

        return $accounts->map(function (FinancialAccount $account) use ($purposeLabels, $totals) {
            $accountTotals = $totals->get($account->id);
            $income = (float) ($accountTotals->income_total ?? 0);
            $expense = (float) ($accountTotals->expense_total ?? 0);

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

    private function expenseByNeedType(User $user, CarbonImmutable $start, CarbonImmutable $end): array
    {
        $totals = Transaction::query()
            ->where('user_id', $user->id)
            ->where('transaction_type', 'expense')
            ->whereBetween('transaction_date', [$start, $end])
            ->selectRaw('need_type, sum(amount) as total')
            ->groupBy('need_type')
            ->pluck('total', 'need_type');

        return [
            [
                'key' => 'need',
                'label' => 'Kebutuhan',
                'amount' => round((float) ($totals['need'] ?? 0), 2),
            ],
            [
                'key' => 'want',
                'label' => 'Keinginan',
                'amount' => round((float) ($totals['want'] ?? 0), 2),
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

    private function sumTransactions(User $user, string $type, CarbonImmutable $start, CarbonImmutable $end): float
    {
        return (float) Transaction::query()
            ->where('user_id', $user->id)
            ->where('transaction_type', $type)
            ->whereBetween('transaction_date', [$start, $end])
            ->sum('amount');
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

    private function weeklyCashflow(User $user, CarbonImmutable $start, CarbonImmutable $end): array
    {
        $transactions = Transaction::query()
            ->where('user_id', $user->id)
            ->whereBetween('transaction_date', [$start, $end])
            ->get(['transaction_date', 'transaction_type', 'amount']);

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
