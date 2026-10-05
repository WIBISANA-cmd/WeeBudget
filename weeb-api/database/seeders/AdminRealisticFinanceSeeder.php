<?php

namespace Database\Seeders;

use App\Models\Bill;
use App\Models\Budget;
use App\Models\FinancialAccount;
use App\Models\FinancialInsight;
use App\Models\FinancialPeriod;
use App\Models\PaydayEvent;
use App\Models\RecurringTransaction;
use App\Models\SavingGoal;
use App\Models\Transaction;
use App\Models\TransactionCategory;
use App\Models\User;
use App\Models\Wishlist;
use App\Services\Finance\MonthlyReportService;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use LogicException;

/**
 * Six payday cycles of believable finances for admin@weebudget.com, ending today.
 *
 * The persona is a salaried office worker in Yogyakarta paid on the 25th (earlier when the 25th
 * falls on a weekend), living in a rented house, paying a motorbike instalment and sending money
 * home every month. Dates are relative to today, so the dashboard always shows a running cycle.
 *
 * Every account balance is kept as a ledger while the rows are written: current_balance is always
 * opening_balance plus the signed transactions, and cash/e-wallet accounts are topped up from the
 * salary account (the same two-row "alokasi" the app writes) whenever they would run dry.
 *
 * Re-running wipes and rebuilds this user's finance data; it refuses to run in production.
 *
 *   php artisan db:seed --class=AdminRealisticFinanceSeeder
 */
class AdminRealisticFinanceSeeder extends Seeder
{
    private const EMAIL = 'admin@weebudget.com';

    private const PAYDAY_DAY = 25;

    private const CYCLES_BACK = 6;

    private const RANDOM_SEED = 20261005;

    private const TZ = 'Asia/Jakarta';

    private const MONTHS = [1 => 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

    private const MONTHS_SHORT = [1 => 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

    private const SALARY_BEFORE_RAISE = 7_250_000;

    private const SALARY_AFTER_RAISE = 7_500_000;

    /** key => [name, type, purpose, institution, identifier, opening balance, is default, notes] */
    private const ACCOUNTS = [
        'bca' => ['BCA Gaji', 'bank', 'salary', 'Bank BCA', '**** 4821', 1_850_000, false, 'Rekening gaji. Begitu gaji masuk, langsung dibagi ke kantong-kantong lain.'],
        'gopay' => ['GoPay', 'e_wallet', 'daily_spending', 'GoPay', '0812-****-7790', 150_000, true, 'Dompet harian untuk makan online, kopi, ojek, dan QRIS.'],
        'tunai' => ['Dompet Tunai', 'cash', 'daily_spending', null, null, 200_000, false, 'Uang tunai untuk warteg, parkir, bensin, dan pasar.'],
        'jago' => ['Jago - Kantong Tagihan', 'digital_bank', 'bills', 'Bank Jago', '**** 6034', 300_000, false, 'Khusus tagihan bulanan: kontrakan, cicilan, listrik, internet, paket data.'],
        'tabungan' => ['Jago - Tabungan Tujuan', 'digital_bank', 'savings', 'Bank Jago', '**** 6035', 3_200_000, false, 'Tabungan laptop kerja dan liburan akhir tahun.'],
        'darurat' => ['SeaBank - Dana Darurat', 'digital_bank', 'emergency_fund', 'SeaBank', '**** 9172', 2_500_000, false, 'Jangan disentuh kecuali darurat. Target 3 bulan pengeluaran.'],
        'emas' => ['Tabungan Emas Pegadaian', 'other', 'investment', 'Pegadaian', '**** 3318', 1_500_000, false, 'Nabung emas rutin tiap gajian.'],
    ];

    /** key => [name, category slug, estimate, due day] */
    private const BILLS = [
        'kontrakan' => ['Kontrakan Bulanan', 'kos-kontrakan', 1_400_000, 1],
        'cicilan' => ['Cicilan Motor Adira Finance', 'cicilan', 685_000, 5],
        'internet' => ['Internet Biznet Home', 'pulsa-internet', 245_000, 10],
        'data' => ['Paket Data Telkomsel Halo', 'pulsa-internet', 65_000, 12],
        'listrik' => ['Listrik PLN Pascabayar', 'listrik-air', 195_000, 20],
    ];

    /** Accounts that get topped up from the salary account when a purchase would overdraw them: [note, smallest top-up]. */
    private const TOP_UPS = [
        'gopay' => ['Top up GoPay lewat BCA mobile', 200_000],
        'tunai' => ['Tarik tunai ATM BCA', 300_000],
        'jago' => ['Tambah saldo kantong tagihan', 100_000],
    ];

    /** Monthly budget per category (slug => amount), judged against calendar-month spending. */
    private const BUDGET = [
        'makan' => 1_300_000,
        'transport' => 450_000,
        'kos-kontrakan' => 1_400_000,
        'pulsa-internet' => 320_000,
        'listrik-air' => 220_000,
        'cicilan' => 685_000,
        'keluarga' => 700_000,
        'belanja-rumah' => 500_000,
        'jajan' => 350_000,
        'hiburan' => 350_000,
        'kesehatan' => 150_000,
        'lainnya' => 350_000,
    ];

    private User $user;

    private CarbonImmutable $today;

    private CarbonImmutable $now;

    private CarbonImmutable $start;

    /** @var array<int, CarbonImmutable> Nominal paydays, oldest first, ending with the coming one. */
    private array $paydays = [];

    /** @var Collection<string, TransactionCategory> */
    private Collection $categories;

    /** @var array<string, int> */
    private array $accountIds = [];

    /** @var array<string, float> */
    private array $balance = [];

    /** @var array<string, SavingGoal> */
    private array $goals = [];

    /** @var array<string, Bill> */
    private array $bills = [];

    /** @var array<string, RecurringTransaction> */
    private array $recurring = [];

    /** @var array<string, Wishlist> */
    private array $wishlists = [];

    /** @var array<int, array<string, mixed>> */
    private array $events = [];

    /** @var array<string, array<string, array{transaction_id: int, date: string, amount: float, late: bool}>> */
    private array $paidBills = [];

    /** @var array<string, float> Total across accounts after the last event of each date. */
    private array $totalAfter = [];

    private float $openingTotal = 0;

    public function run(): void
    {
        if (app()->isProduction()) {
            $this->command?->error('AdminRealisticFinanceSeeder is demo data and refuses to run in production.');

            return;
        }

        $this->call(TransactionCategorySeeder::class);

        $user = $this->resolveUser();
        if (! $user) {
            $this->command?->warn(self::EMAIL.' does not exist. Set WEEB_ADMIN_EMAIL/WEEB_ADMIN_PASSWORD or create the user first.');

            return;
        }

        $this->user = $user;
        $this->today = CarbonImmutable::today();
        $this->now = CarbonImmutable::now();
        $this->categories = TransactionCategory::query()->whereNull('user_id')->get()->keyBy('slug');
        $this->buildCalendar();
        mt_srand(self::RANDOM_SEED);

        DB::transaction(function () {
            $this->wipe();
            $this->seedProfile();
            $this->seedAccounts();
            $this->seedGoals();
            $this->seedBills();
            $this->seedRecurring();
            $this->seedWishlists();

            $this->buildEvents();
            $this->applyEvents();

            $this->finishAccounts();
            $this->finishGoals();
            $this->finishBills();
            $this->seedPaydayEvents();
            $this->seedPeriods();
            $this->seedBudgets();
            $this->seedMonthlyReports();
            $this->seedInsights();
        });

        $this->command?->info(sprintf(
            'Seeded %d transactions, %d accounts and %d payday cycles for %s.',
            Transaction::query()->where('user_id', $this->user->id)->count(),
            count($this->accountIds),
            count($this->paydays) - 1,
            self::EMAIL,
        ));
    }

    private function resolveUser(): ?User
    {
        $user = User::query()->where('email', self::EMAIL)->first();

        if (! $user && env('WEEB_ADMIN_EMAIL') === self::EMAIL) {
            $this->call(AdminUserSeeder::class);
            $user = User::query()->where('email', self::EMAIL)->first();
        }

        return $user;
    }

    // --- calendar ----------------------------------------------------------------------------

    private function buildCalendar(): void
    {
        $latest = $this->nominalPayday($this->today->startOfMonth());
        if ($latest->greaterThan($this->today)) {
            $latest = $this->nominalPayday($this->today->startOfMonth()->subMonthNoOverflow());
        }

        for ($index = -self::CYCLES_BACK; $index <= 1; $index++) {
            $this->paydays[$index] = $this->nominalPayday($latest->startOfMonth()->addMonthsNoOverflow($index));
        }

        // The first salary may land on the Friday before a weekend payday.
        $this->start = $this->payDate($this->paydays[-self::CYCLES_BACK]);
    }

    private function nominalPayday(CarbonImmutable $month): CarbonImmutable
    {
        return $month->startOfMonth()->setDay(min(self::PAYDAY_DAY, $month->daysInMonth));
    }

    /** The day the salary actually arrives: the Friday before when the payday is on a weekend. */
    private function payDate(CarbonImmutable $nominal): CarbonImmutable
    {
        return match (true) {
            $nominal->isSaturday() => $nominal->subDay(),
            $nominal->isSunday() => $nominal->subDays(2),
            default => $nominal,
        };
    }

    private function salaryFor(int $cycle): int
    {
        return $cycle >= -2 ? self::SALARY_AFTER_RAISE : self::SALARY_BEFORE_RAISE;
    }

    private function monthLabel(CarbonImmutable $date): string
    {
        return self::MONTHS[$date->month].' '.$date->year;
    }

    private function rupiah(float|int $amount): string
    {
        return 'Rp'.number_format($amount, 0, ',', '.');
    }

    private function at(CarbonImmutable $date, int $hour, int $minute): CarbonImmutable
    {
        return CarbonImmutable::create($date->year, $date->month, $date->day, $hour, $minute, 0, self::TZ);
    }

    // --- randomness --------------------------------------------------------------------------

    private function amount(int $min, int $max, int $step = 1000): int
    {
        return (int) (round(mt_rand($min, $max) / $step) * $step);
    }

    private function chance(float $probability): bool
    {
        return mt_rand(1, 10_000) <= $probability * 10_000;
    }

    private function pick(array $items): mixed
    {
        return $items[mt_rand(0, count($items) - 1)];
    }

    /** @param array<string, int> $weights */
    private function weighted(array $weights): string
    {
        $roll = mt_rand(1, array_sum($weights));
        foreach ($weights as $key => $weight) {
            $roll -= $weight;
            if ($roll <= 0) {
                return $key;
            }
        }

        return array_key_first($weights);
    }

    private function time(CarbonImmutable $date, int $fromHour, int $toHour): CarbonImmutable
    {
        return $this->at($date, mt_rand($fromHour, $toHour - 1), mt_rand(0, 59));
    }

    // --- reset -------------------------------------------------------------------------------

    private function wipe(): void
    {
        $id = $this->user->id;

        Transaction::withTrashed()->where('user_id', $id)->forceDelete();
        // Goals and bills take their entries and payments with them (cascade).
        SavingGoal::withTrashed()->where('user_id', $id)->forceDelete();
        Bill::withTrashed()->where('user_id', $id)->forceDelete();
        RecurringTransaction::withTrashed()->where('user_id', $id)->forceDelete();
        Wishlist::withTrashed()->where('user_id', $id)->forceDelete();
        Budget::query()->where('user_id', $id)->delete();
        FinancialPeriod::withTrashed()->where('user_id', $id)->forceDelete();
        PaydayEvent::query()->where('user_id', $id)->delete();
        FinancialInsight::query()->where('user_id', $id)->delete();
        DB::table('monthly_reports')->where('user_id', $id)->delete();
        FinancialAccount::withTrashed()->where('user_id', $id)->forceDelete();
    }

    // --- profile, accounts, goals, bills, recurring, wishlist --------------------------------

    private function seedProfile(): void
    {
        $this->user->update(['last_login_at' => $this->now->subHours(2)]);

        $this->user->profile()->updateOrCreate(['user_id' => $this->user->id], [
            'currency' => 'IDR',
            'timezone' => self::TZ,
            'payday_day' => self::PAYDAY_DAY,
            'payday_frequency' => 'monthly',
            'monthly_income_estimate' => self::SALARY_AFTER_RAISE,
            'daily_safe_amount_target' => 85_000,
            'account_mode' => 'personal',
            'transaction_reminder_enabled' => true,
            'transaction_reminder_time' => '20:30',
            'budget_planner_allocations' => null,
            'budget_planner_base_amount' => self::SALARY_AFTER_RAISE,
            'onboarding_completed_at' => $this->start->toDateString(),
        ]);
        $this->user->load('profile');
    }

    private function seedAccounts(): void
    {
        foreach (self::ACCOUNTS as $key => [$name, $type, $purpose, $institution, $identifier, $opening, $isDefault, $notes]) {
            $account = FinancialAccount::query()->create([
                'user_id' => $this->user->id,
                'name' => $name,
                'type' => $type,
                'purpose' => $purpose,
                'institution_name' => $institution,
                'account_identifier' => $identifier,
                'opening_balance' => $opening,
                'current_balance' => $opening,
                'is_default' => $isDefault,
                'is_active' => true,
                'notes' => $notes,
            ]);

            $this->accountIds[$key] = $account->id;
            $this->balance[$key] = (float) $opening;
            $this->openingTotal += $opening;
        }
    }

    private function seedGoals(): void
    {
        $yearEnd = $this->today->month === 12 && $this->today->day > 20
            ? CarbonImmutable::create($this->today->year + 1, 12, 20)
            : CarbonImmutable::create($this->today->year, 12, 20);

        $definitions = [
            'darurat' => ['Dana Darurat 3 Bulan', 'emergency_fund', 18_000_000, $this->today->addMonths(10), 1, 2_500_000],
            'laptop' => ['Laptop kerja baru', 'saving', 14_000_000, $this->today->addMonths(8), 2, 2_700_000],
            'liburan' => ['Liburan akhir tahun ke Bali', 'saving', 5_000_000, $yearEnd, 3, 500_000],
        ];

        foreach ($definitions as $key => [$name, $type, $target, $targetDate, $priority, $opening]) {
            $goal = SavingGoal::query()->create([
                'user_id' => $this->user->id,
                'name' => $name,
                'type' => $type,
                'target_amount' => $target,
                'current_amount' => 0,
                'target_date' => $targetDate->toDateString(),
                'priority' => $priority,
                'status' => 'active',
            ]);
            $goal->forceFill(['created_at' => $this->start->subDays(40), 'updated_at' => $this->start->subDays(40)])->saveQuietly();
            $this->goals[$key] = $goal;

            // Whatever was already saved before the data starts.
            $this->goalEntry($key, 'adjustment', $opening, $this->start, 'Saldo awal sebelum pencatatan di WeeBudget', null);
        }
    }

    private function goalEntry(string $goal, string $type, int $amount, CarbonImmutable $date, ?string $notes, ?int $transactionId): void
    {
        DB::table('saving_goal_entries')->insert([
            'saving_goal_id' => $this->goals[$goal]->id,
            'transaction_id' => $transactionId,
            'entry_type' => $type,
            'amount' => $amount,
            'entry_date' => $date->toDateString(),
            'notes' => $notes,
            'created_at' => $date->utc(),
            'updated_at' => $date->utc(),
        ]);
    }

    private function seedBills(): void
    {
        foreach (self::BILLS as $key => [$name, $slug, $estimate, $dueDay]) {
            $this->bills[$key] = Bill::query()->create([
                'user_id' => $this->user->id,
                'category_id' => $this->categories[$slug]->id,
                'name' => $name,
                'amount_estimate' => $estimate,
                'due_day' => $dueDay,
                'next_due_date' => null,
                'frequency' => 'monthly',
                'reminder_days' => [3, 1, 0],
                'status' => 'active',
            ]);
        }
    }

    private function seedRecurring(): void
    {
        $nextPayday = $this->paydays[1];
        $definitions = [
            'gaji' => ['Gaji bulanan', 'income', 'gaji', 'bca', self::SALARY_AFTER_RAISE, 25, $nextPayday, 'active', 'Transfer gaji dari PT Mitra Kreasi Nusantara, maju ke Jumat bila tanggal 25 jatuh di akhir pekan.'],
            'ibu' => ['Kirim uang bulanan ke ibu', 'expense', 'keluarga', 'bca', 600_000, 26, $nextPayday->addDay(), 'active', 'Transfer ke rekening ibu di Klaten, sehari setelah gajian.'],
            'spotify' => ['Spotify Premium', 'expense', 'hiburan', 'gopay', 54_990, 14, $this->nextOccurrence(14), 'active', 'Dibayar otomatis lewat GoPay.'],
            'netflix' => ['Netflix Mobile', 'expense', 'hiburan', 'gopay', 54_000, 20, $this->nextOccurrence(20), 'active', 'Paket mobile, dipakai untuk nonton akhir pekan.'],
            'gym' => ['Membership gym', 'expense', 'kesehatan', 'bca', 175_000, 8, null, 'paused', 'Dijeda sejak sebelum Maret karena jarang dipakai.'],
        ];

        foreach ($definitions as $key => [$name, $type, $slug, $account, $amount, $day, $next, $status, $notes]) {
            $this->recurring[$key] = RecurringTransaction::query()->create([
                'user_id' => $this->user->id,
                'account_id' => $this->accountIds[$account],
                'category_id' => $this->categories[$slug]->id,
                'name' => $name,
                'transaction_type' => $type,
                'amount' => $amount,
                'frequency' => 'monthly',
                'day_of_month' => $day,
                'next_run_date' => $next?->toDateString(),
                'status' => $status,
                'notes' => $notes,
            ]);
        }
    }

    /** The next date the given day of month comes around, counting today as already handled. */
    private function nextOccurrence(int $day): CarbonImmutable
    {
        $candidate = $this->today->setDay(min($day, $this->today->daysInMonth));

        if ($candidate->greaterThan($this->today)) {
            return $candidate;
        }

        $next = $this->today->startOfMonth()->addMonthNoOverflow();

        return $next->setDay(min($day, $next->daysInMonth));
    }

    private function seedWishlists(): void
    {
        $income = self::SALARY_AFTER_RAISE;
        $items = [
            'keyboard' => ['Keyboard mekanik Keychron K2', 1_450_000, 'want', 14, 8, 'waiting', 'Masih dalam masa tunggu. Kalau 2 minggu lagi masih kepengin, baru dipertimbangkan.'],
            'sepatu' => ['Sepatu lari Adidas Duramo', 680_000, 'want', 14, 52, 'bought', 'Dibeli setelah masa tunggu selesai, dipakai lari pagi tiap Minggu.'],
            'powerbank' => ['Power bank Anker 20.000 mAh', 520_000, 'want', 7, 20, 'approved', 'Disetujui, tinggal tunggu diskon tanggal kembar.'],
            'laptop' => ['Laptop kerja baru', 14_000_000, 'need', 30, 150, 'converted_to_goal', 'Terlalu besar untuk sekali bayar, dijadikan target tabungan.'],
            'drone' => ['Drone DJI Mini 4K', 6_500_000, 'want', 30, 95, 'cancelled', 'Dibatalkan. Setelah dipikir ulang, jarang dipakai dan cicilannya bikin sesak.'],
            'kursi' => ['Kursi ergonomis', 950_000, 'need', 30, 3, 'waiting', 'Punggung sering pegal kalau lembur. Dicek lagi setelah gajian.'],
        ];

        foreach ($items as $key => [$name, $price, $needType, $waitingDays, $createdDaysAgo, $status, $notes]) {
            $created = $this->today->subDays($createdDaysAgo);
            $wishlist = Wishlist::query()->create([
                'user_id' => $this->user->id,
                'name' => $name,
                'estimated_amount' => $price,
                'need_type' => $needType,
                'waiting_days' => $waitingDays,
                'waiting_until' => $created->addDays($waitingDays)->toDateString(),
                'status' => $status,
                'impact_snapshot' => [
                    'price' => $price,
                    'percent_of_monthly_income' => round($price / $income * 100, 1),
                    'equivalent_daily_safe_days' => round($price / 85_000, 1),
                    'recommendation' => $price > $income * 0.5
                        ? 'Terlalu besar untuk dibeli sekaligus. Jadikan target tabungan.'
                        : ($needType === 'need' ? 'Masuk akal, selama tidak mengganggu dana darurat.' : 'Tunggu masa tenang selesai sebelum memutuskan.'),
                ],
                'notes' => $notes,
            ]);
            $wishlist->forceFill(['created_at' => $created->setTime(21, 15), 'updated_at' => $created->setTime(21, 15)])->saveQuietly();
            $this->wishlists[$key] = $wishlist;
        }
    }

    // --- events ------------------------------------------------------------------------------

    /** @param array<string, mixed> $extra */
    private function income(CarbonImmutable $at, string $account, string $category, string $description, int $amount, array $extra = []): void
    {
        $this->events[] = [...$extra, 'kind' => 'tx', 'type' => 'income', 'at' => $at, 'account' => $account, 'category' => $category, 'description' => $description, 'amount' => $amount];
    }

    /** @param array<string, mixed> $extra */
    private function expense(CarbonImmutable $at, string $account, string $category, string $description, int $amount, array $extra = []): void
    {
        $this->events[] = [...$extra, 'kind' => 'tx', 'type' => 'expense', 'at' => $at, 'account' => $account, 'category' => $category, 'description' => $description, 'amount' => $amount];
    }

    /** @param array<string, int> $splits goal key => amount */
    private function allocation(CarbonImmutable $at, string $from, string $to, int $amount, string $notes, array $splits = []): void
    {
        $this->events[] = ['kind' => 'allocation', 'at' => $at, 'from' => $from, 'to' => $to, 'amount' => $amount, 'notes' => $notes, 'splits' => $splits];
    }

    private function buildEvents(): void
    {
        $this->buildSalaryEvents();
        $this->buildBillEvents();
        $this->buildSubscriptionEvents();
        $this->buildOneOffEvents();
        $this->buildDailyEvents();

        // A stable tie-breaker for events that share a minute.
        foreach ($this->events as $index => $event) {
            $this->events[$index]['seq'] = $index;
        }
    }

    private function buildSalaryEvents(): void
    {
        foreach ($this->paydays as $cycle => $nominal) {
            if ($cycle > 0) {
                continue;
            }

            $date = $this->payDate($nominal);
            $salary = $this->salaryFor($cycle);
            $label = $this->monthLabel($nominal);
            $raise = $cycle === -2;

            $this->income(
                $this->at($date, 8, 5),
                'bca',
                'gaji',
                "Gaji {$label}",
                $salary,
                ['recurring' => 'gaji', 'notes' => $raise ? 'Gaji naik setelah penyesuaian berkala.' : null],
            );

            if ($raise) {
                $this->income($this->at($date, 8, 6), 'bca', 'bonus', 'Bonus kinerja semester I', 2_000_000, ['notes' => 'Cair bersamaan dengan gaji bulan ini.']);
            }

            // Split the salary the evening it lands.
            $savings = $cycle >= -2 ? 1_000_000 : 900_000;
            $laptopShare = $savings === 900_000 ? 600_000 : 650_000;
            $plan = [
                ['jago', 2_650_000, 'Jatah tagihan bulanan: kontrakan, cicilan, listrik, internet', []],
                ['gopay', 1_200_000, 'Jatah harian GoPay', []],
                ['tunai', 800_000, 'Tarik tunai ATM untuk jajan dan bensin', []],
                ['tabungan', $savings, 'Setoran tabungan tujuan', ['laptop' => $laptopShare, 'liburan' => $savings - $laptopShare]],
                ['darurat', 500_000, 'Setoran dana darurat bulanan', ['darurat' => 500_000]],
                ['emas', 250_000, 'Nabung emas bulanan', []],
            ];

            foreach ($plan as $position => [$to, $amount, $notes, $splits]) {
                $this->allocation($this->at($date, 19, 10 + $position * 3), 'bca', $to, $amount, $notes, $splits);
            }

            if ($raise) {
                $this->allocation($this->at($date, 19, 40), 'bca', 'darurat', 1_000_000, 'Sebagian bonus semester untuk dana darurat', ['darurat' => 1_000_000]);
                $this->allocation($this->at($date, 19, 43), 'bca', 'tabungan', 500_000, 'Sebagian bonus semester untuk tabungan laptop', ['laptop' => 500_000]);
            }

            $this->expense(
                $this->at($nominal->addDay(), 10, 20),
                'bca',
                'keluarga',
                'Kirim uang bulanan ke ibu',
                600_000,
                ['recurring' => 'ibu', 'notes' => 'Transfer BI-FAST, tanpa biaya admin.'],
            );
        }
    }

    private function buildBillEvents(): void
    {
        $lateMonth = $this->today->startOfMonth()->subMonthsNoOverflow(3)->format('Y-m');

        for ($month = $this->start->startOfMonth(); $month->lessThanOrEqualTo($this->today); $month = $month->addMonthNoOverflow()) {
            foreach (self::BILLS as $key => [$name, $slug, $estimate, $dueDay]) {
                $due = $month->setDay(min($dueDay, $month->daysInMonth));
                if ($due->lessThan($this->start) || $due->greaterThan($this->today)) {
                    continue;
                }

                $late = $key === 'cicilan' && $due->format('Y-m') === $lateMonth;
                $paidOn = $late ? $due->addDays(2) : $due;
                $monthName = self::MONTHS[$due->month];

                [$description, $amount, $notes] = match ($key) {
                    'kontrakan' => ["Bayar kontrakan {$monthName}", $estimate, 'Transfer ke Pak Hartono, pemilik kontrakan.'],
                    'cicilan' => ["Cicilan motor Adira {$monthName}", $estimate, sprintf('Cicilan ke-%d dari 36.%s', ($due->year - 2025) * 12 + $due->month, $late ? ' Telat 2 hari karena lupa jadwal debet.' : '')],
                    'internet' => ["Biznet Home {$monthName}", $estimate, null],
                    'data' => ["Paket data Telkomsel {$monthName}", $estimate, 'Debet otomatis.'],
                    'listrik' => ["Listrik PLN {$monthName}", $this->amount(165_000, 240_000), 'Tagihan pascabayar, naik kalau AC sering nyala.'],
                };

                $at = $key === 'kontrakan' ? $this->time($paidOn, 9, 20) : ($late ? $this->time($paidOn, 18, 21) : $this->time($paidOn, 8, 11));

                $this->expense($at, 'jago', $slug, $description, $amount, ['bill' => $key, 'due_month' => $due->format('Y-m'), 'notes' => $notes, 'late' => $late]);
            }
        }
    }

    private function buildSubscriptionEvents(): void
    {
        for ($month = $this->start->startOfMonth(); $month->lessThanOrEqualTo($this->today); $month = $month->addMonthNoOverflow()) {
            foreach ([['spotify', 14, 'Spotify Premium', 54_990], ['netflix', 20, 'Netflix Mobile', 54_000]] as [$key, $day, $name, $amount]) {
                $date = $month->setDay(min($day, $month->daysInMonth));
                if ($date->lessThan($this->start) || $date->greaterThan($this->today)) {
                    continue;
                }

                $this->expense($this->time($date, 0, 6), 'gopay', 'hiburan', "{$name} ".self::MONTHS_SHORT[$date->month], $amount, ['recurring' => $key, 'need_type' => 'want']);
            }
        }
    }

    /** One-off events, placed relative to a payday cycle: [cycle, day offset from payday, ...]. */
    private function buildOneOffEvents(): void
    {
        $when = fn (int $cycle, int $offset, int $hour = 12, int $minute = 0) => $this->at($this->paydays[$cycle]->addDays($offset), $hour, $minute);

        $incomes = [
            [-6, 11, 14, 'bca', 'lembur', 'Uang lembur bulan Maret', 275_000, null],
            [-6, 13, 10, 'bca', 'freelance', 'Freelance desain cover buku (Penerbit Mandala)', 650_000, 'Termin pelunasan, sudah dipotong pajak.'],
            [-5, 25, 16, 'bca', 'freelance', 'Freelance layout jurnal ilmiah', 900_000, null],
            [-4, 9, 11, 'bca', 'jualan', 'Jual HP lama Redmi Note 9 (Tokopedia)', 1_100_000, 'Dikirim lewat J&T, dana cair setelah pembeli konfirmasi.'],
            [-4, 19, 15, 'bca', 'lainnya', 'Reimburse perjalanan dinas Jakarta', 560_000, 'Tiket KA dan taksi diganti kantor.'],
            [-3, 14, 10, 'bca', 'lembur', 'Uang lembur proyek katalog', 325_000, null],
            [-3, 16, 20, 'bca', 'freelance', 'Freelance ilustrasi buku anak', 450_000, null],
            [-2, 21, 14, 'bca', 'freelance', 'Freelance edit video profil UMKM', 350_000, null],
            [-1, 17, 13, 'bca', 'freelance', 'Freelance desain feed Instagram', 750_000, 'Klien baru, minta paket 12 desain.'],
            [-1, 18, 10, 'bca', 'lembur', 'Uang lembur event pameran buku', 300_000, null],
            [0, 8, 10, 'bca', 'lembur', 'Uang lembur bulan Agustus', 300_000, null],
        ];

        foreach ($incomes as [$cycle, $offset, $hour, $account, $slug, $description, $amount, $notes]) {
            $at = $when($cycle, $offset, $hour, mt_rand(0, 40));
            $this->income($at, $account, $slug, $description, $amount, ['notes' => $notes]);
        }

        $expenses = [
            [-6, 9, 10, 'tunai', 'transport', 'Servis rutin motor + ganti oli (AHASS)', 185_000, 'need', null, null],
            [-6, 20, 16, 'bca', 'kesehatan', 'Periksa dan scaling gigi - Klinik Sehat', 250_000, 'need', null, null],
            [-5, 4, 19, 'gopay', 'lainnya', 'Kado ulang tahun Dimas', 150_000, 'want', null, null],
            [-5, 22, 11, 'tunai', 'lainnya', 'Kondangan nikahan Rina (amplop + bensin)', 250_000, 'want', null, null],
            [-4, 2, 9, 'tunai', 'lainnya', 'Patungan kurban kantor', 250_000, 'want', null, null],
            [-4, 12, 6, 'bca', 'transport', 'Tiket KA Lempuyangan - Gambir PP (dinas)', 560_000, 'need', 'Nanti diganti kantor.', null],
            [-3, 7, 14, 'bca', 'belanja-rumah', 'Dispenser Miyako (Shopee)', 285_000, 'need', 'Dispenser lama bocor.', null],
            [-3, 20, 9, 'bca', 'kesehatan', 'Medical check-up tahunan', 380_000, 'need', 'Hasil lab aman, kolesterol batas atas.', null],
            [-2, 3, 13, 'tunai', 'lainnya', 'Kado pernikahan Bagas', 200_000, 'want', null, null],
            [-2, 19, 10, 'bca', 'transport', 'Ganti ban belakang + servis besar', 420_000, 'need', null, null],
            [-2, 23, 16, 'tunai', 'lainnya', 'Iuran 17 Agustusan RT', 50_000, 'need', null, null],
            [-1, 6, 21, 'bca', 'lainnya', 'Case HP + tempered glass (Shopee)', 95_000, 'want', null, null],
            [-1, 11, 17, 'bca', 'lainnya', 'Sepatu lari Adidas Duramo', 680_000, 'want', 'Dari wishlist, setelah masa tunggu 2 minggu.', 'sepatu'],
            [-1, 25, 12, 'bca', 'keluarga', 'Hadiah ulang tahun ibu', 350_000, 'need', null, null],
            [0, 2, 10, 'tunai', 'transport', 'Servis motor 10.000 km', 160_000, 'need', null, null],
            [0, 9, 17, 'gopay', 'hiburan', 'Tiket konser band lokal', 275_000, 'want', 'Berdua sama Dimas.', null],
        ];

        foreach ($expenses as [$cycle, $offset, $hour, $account, $slug, $description, $amount, $needType, $notes, $wishlist]) {
            $this->expense($when($cycle, $offset, $hour, mt_rand(0, 40)), $account, $slug, $description, $amount, ['need_type' => $needType, 'notes' => $notes, 'wishlist' => $wishlist]);
        }
    }

    private function buildDailyEvents(): void
    {
        $monthlyShopping = [];
        foreach ($this->paydays as $nominal) {
            $monthlyShopping[$nominal->addDays(3)->toDateString()] = true;
        }

        $next = [];
        // Returns true on the day a recurring chore falls due, then schedules the next one.
        $due = function (string $key, CarbonImmutable $day, int $minGap, int $maxGap) use (&$next): bool {
            $next[$key] ??= $this->start->addDays(mt_rand(1, $maxGap));
            if ($day->lessThan($next[$key])) {
                return false;
            }
            $next[$key] = $day->addDays(mt_rand($minGap, $maxGap));

            return true;
        };

        $lastFuel = $this->start->subDays(3);

        for ($day = $this->start; $day->lessThanOrEqualTo($this->today); $day = $day->addDay()) {
            $weekend = $day->isWeekend();
            $workday = ! $weekend;

            if ($this->chance($workday ? 0.30 : 0.20)) {
                $this->expense($this->time($day, 6, 8), $this->weighted(['tunai' => 85, 'gopay' => 15]), 'makan', $this->pick([
                    'Sarapan bubur ayam', 'Sarapan nasi kuning', 'Gorengan + teh hangat', 'Roti dan susu Indomaret',
                ]), $this->amount(8_000, 20_000, 500));
            }

            if ($this->chance($workday ? 0.92 : 0.85)) {
                $delivery = $this->chance($workday ? 0.08 : 0.18);
                if ($delivery) {
                    $this->expense($this->time($day, 11, 14), 'gopay', 'makan', $this->pick(['GoFood ayam bakar + es teh', 'GoFood nasi campur', 'GrabFood geprek + es jeruk']), $this->amount(32_000, 48_000, 500));
                } else {
                    $this->expense($this->time($day, 11, 14), $this->weighted(['tunai' => 55, 'gopay' => 45]), 'makan', $this->pick([
                        'Makan siang warteg', 'Nasi padang Sederhana', 'Ayam geprek Bu Rum', 'Soto ayam Pak Man',
                        'Mie ayam bakso', 'Gudeg Bu Tini', 'Nasi goreng kantin kantor',
                    ]), $this->amount(13_000, 28_000, 500));
                }
            }

            if ($this->chance($workday ? 0.70 : 0.85)) {
                $meals = ['Pecel lele Mas Joko', 'Nasi goreng kambing', 'Warung burjo - magelangan', 'Bakso Pak Slamet', 'Seblak + es jeruk', 'Sate ayam 10 tusuk'];
                if ($weekend) {
                    $meals = [...$meals, 'Makan malam bareng teman - Mie Gacoan', 'Bebek goreng Pak Ndut', 'Geprek Bensu'];
                }
                $online = $this->chance(0.25);
                $this->expense(
                    $this->time($day, 18, 21),
                    $online ? 'gopay' : 'tunai',
                    'makan',
                    $online ? $this->pick(['GrabFood nasi ayam', 'GoFood sate + lontong', 'GoFood nasi goreng']) : $this->pick($meals),
                    $online ? $this->amount(32_000, 48_000, 500) : $this->amount(12_000, $weekend ? 40_000 : 28_000, 500),
                );
            }

            if ($this->chance($workday ? 0.45 : 0.50)) {
                $drink = $this->pick(['Kopi Kenangan Mantan', 'Janji Jiwa kopi susu', 'Es kopi susu Tuku', 'Es teh Poci', 'Boba Chatime', 'Americano Starbucks']);
                $price = match ($drink) {
                    'Es teh Poci' => $this->amount(5_000, 8_000, 500),
                    'Boba Chatime' => $this->amount(26_000, 38_000, 500),
                    'Americano Starbucks' => $this->amount(38_000, 50_000, 500),
                    default => $this->amount(18_000, 27_000, 500),
                };
                $this->expense($this->time($day, 9, 17), $drink === 'Es teh Poci' ? 'tunai' : $this->weighted(['gopay' => 70, 'tunai' => 30]), 'jajan', $drink, $price, ['need_type' => 'want']);
            }

            // Transport.
            if ($lastFuel->diffInDays($day) >= mt_rand(5, 7)) {
                $lastFuel = $day;
                $this->expense($this->time($day, 7, 18), $this->weighted(['tunai' => 70, 'gopay' => 30]), 'transport', 'Isi bensin Pertalite', $this->amount(22_000, 35_000));
            }
            if ($workday && $this->chance(0.25)) {
                $this->expense($this->time($day, 7, 9), 'tunai', 'transport', 'Parkir', $this->amount(2_000, 3_000, 500));
            }
            if ($workday && $this->chance(0.12)) {
                $this->expense($this->time($day, 7, 20), 'gopay', 'transport', $this->pick(['GoRide ke kantor (hujan)', 'GoRide pulang lembur', 'Grab ke Stasiun Tugu']), $this->amount(15_000, 32_000, 500));
            }

            // Household.
            if ($day->isSaturday() && $this->chance(0.8)) {
                $this->expense($this->time($day, 8, 17), $this->weighted(['tunai' => 50, 'gopay' => 50]), 'belanja-rumah', $this->pick(['Belanja mingguan Alfamart', 'Belanja mingguan Indomaret']), $this->amount(30_000, 65_000));
            }
            if ($day->isSunday() && $this->chance(0.4)) {
                $this->expense($this->time($day, 6, 9), 'tunai', 'belanja-rumah', 'Belanja sayur dan lauk di pasar', $this->amount(30_000, 60_000));
            }
            if (isset($monthlyShopping[$day->toDateString()])) {
                $this->expense($this->time($day, 10, 17), 'gopay', 'belanja-rumah', 'Belanja bulanan Superindo', $this->amount(120_000, 200_000), ['notes' => 'Stok beras, minyak, telur, dan kebutuhan dapur.']);
            }
            if ($due('galon', $day, 11, 13)) {
                $this->expense($this->time($day, 16, 19), 'tunai', 'belanja-rumah', 'Isi ulang galon 19 liter', $this->amount(6_000, 8_000, 500));
            }
            if ($due('lpg', $day, 26, 32)) {
                $this->expense($this->time($day, 8, 12), 'tunai', 'belanja-rumah', 'Gas LPG 3 kg', 22_000);
            }
            if ($due('sabun', $day, 24, 32)) {
                $this->expense($this->time($day, 15, 19), 'gopay', 'belanja-rumah', 'Sabun, sampo, dan deterjen (Indomaret)', $this->amount(45_000, 85_000));
            }

            // Personal care and health.
            if ($due('laundry', $day, 12, 16)) {
                $this->expense($this->time($day, 16, 19), 'tunai', 'lainnya', 'Laundry kiloan 5 kg', $this->amount(35_000, 45_000, 5_000), ['need_type' => 'need']);
            }
            if ($due('cukur', $day, 26, 34)) {
                $this->expense($this->time($day, 16, 19), 'tunai', 'lainnya', 'Potong rambut barbershop', 40_000, ['need_type' => 'need']);
            }
            if ($due('obat', $day, 28, 50)) {
                $this->expense($this->time($day, 17, 21), $this->weighted(['tunai' => 50, 'gopay' => 50]), 'kesehatan', $this->pick(['Obat flu dan paracetamol (K24)', 'Vitamin C dan multivitamin', 'Obat maag dan antasida']), $this->amount(18_000, 90_000));
            }
            if ($workday && $this->chance(0.05)) {
                $this->expense($this->time($day, 9, 16), 'tunai', 'lainnya', 'Fotokopi dan jilid dokumen', $this->amount(8_000, 20_000, 500), ['need_type' => 'need']);
            }

            // Fun.
            if ($day->isFriday() && $this->chance(0.45)) {
                $this->expense($this->time($day, 19, 21), 'tunai', 'hiburan', 'Sewa lapangan futsal (patungan)', $this->amount(25_000, 35_000, 5_000), ['need_type' => 'want']);
            }
            if ($weekend && $this->chance(0.20)) {
                $this->expense($this->time($day, 13, 20), 'gopay', 'hiburan', 'Nonton Cinema XXI', $this->amount(40_000, 55_000, 5_000), ['need_type' => 'want']);
            }
            if ($due('steam', $day, 40, 70)) {
                $this->expense($this->time($day, 20, 23), 'gopay', 'hiburan', 'Top up Steam Wallet', $this->amount(50_000, 100_000, 10_000), ['need_type' => 'want']);
            }

            if ($this->chance(0.01)) {
                $this->expense($this->time($day, 10, 20), 'bca', 'lainnya', $this->pick(['Belanja online Shopee - aksesoris motor', 'Belanja online Tokopedia - kabel dan charger', 'Belanja online Shopee - kaos polos']), $this->amount(50_000, 180_000), ['need_type' => 'want']);
            }
        }
    }

    // --- applying events to the ledger -------------------------------------------------------

    private function applyEvents(): void
    {
        // Nothing in the future: today only holds what would already have happened by now.
        $events = array_values(array_filter($this->events, fn (array $event) => $event['at']->lessThanOrEqualTo($this->now)));
        usort($events, fn (array $a, array $b) => [$a['at']->getTimestamp(), $a['seq']] <=> [$b['at']->getTimestamp(), $b['seq']]);

        foreach ($events as $event) {
            if ($event['kind'] === 'allocation') {
                $this->applyAllocation($event['from'], $event['to'], $event['amount'], $event['at'], $event['notes'], $event['splits']);
            } else {
                $this->applyTransaction($event);
            }

            $this->totalAfter[$event['at']->toDateString()] = array_sum($this->balance);
        }
    }

    /** @param array<string, mixed> $event */
    private function applyTransaction(array $event): void
    {
        $account = $event['account'];
        $isExpense = $event['type'] === 'expense';

        if ($isExpense) {
            $this->ensureFunds($account, $event['amount'], $event['at']);
        }

        $category = $this->categories[$event['category']];
        $transaction = new Transaction([
            'user_id' => $this->user->id,
            'account_id' => $this->accountIds[$account],
            'category_id' => $category->id,
            'recurring_transaction_id' => isset($event['recurring']) ? $this->recurring[$event['recurring']]->id : null,
            'bill_id' => isset($event['bill']) ? $this->bills[$event['bill']]->id : null,
            'wishlist_id' => ! empty($event['wishlist']) ? $this->wishlists[$event['wishlist']]->id : null,
            'transaction_type' => $event['type'],
            'amount' => $event['amount'],
            'need_type' => $isExpense ? ($event['need_type'] ?? $category->need_type) : null,
            'transaction_date' => $event['at']->toDateString(),
            'occurred_at' => $event['at']->utc(),
            'description' => $event['description'],
            'notes' => $event['notes'] ?? null,
            'source' => null,
            'metadata' => null,
        ]);
        $transaction->created_at = $event['at']->utc();
        $transaction->updated_at = $event['at']->utc();
        $transaction->save();

        $this->balance[$account] += $isExpense ? -$event['amount'] : $event['amount'];

        if (isset($event['bill'])) {
            $this->paidBills[$event['bill']][$event['due_month']] = [
                'transaction_id' => $transaction->id,
                'date' => $event['at']->toDateString(),
                'amount' => (float) $event['amount'],
                'late' => (bool) ($event['late'] ?? false),
            ];
        }
    }

    private function ensureFunds(string $account, float $amount, CarbonImmutable $at): void
    {
        if ($this->balance[$account] >= $amount) {
            return;
        }

        if (! isset(self::TOP_UPS[$account])) {
            throw new LogicException(sprintf('%s would go negative on %s (balance %s, needs %s).', $account, $at->toDateString(), $this->rupiah($this->balance[$account]), $this->rupiah($amount)));
        }

        [$note, $smallest] = self::TOP_UPS[$account];
        $deficit = $amount - $this->balance[$account];
        $topUp = max($smallest, (int) (ceil($deficit / 100_000) * 100_000));

        $this->applyAllocation('bca', $account, $topUp, $at->subMinutes(mt_rand(4, 25)), $note, []);
    }

    /**
     * Moves money between two own accounts exactly like AccountBalanceService::allocateBetweenAccounts:
     * an expense leg on the source and an income leg on the destination, pointing at each other.
     *
     * @param array<string, int> $splits goal key => amount credited to that goal
     */
    private function applyAllocation(string $from, string $to, int $amount, CarbonImmutable $at, string $notes, array $splits): void
    {
        if ($this->balance[$from] < $amount) {
            throw new LogicException(sprintf('%s cannot fund a %s allocation to %s on %s (balance %s).', $from, $this->rupiah($amount), $to, $at->toDateString(), $this->rupiah($this->balance[$from])));
        }

        $sourceName = self::ACCOUNTS[$from][0];
        $destinationName = self::ACCOUNTS[$to][0];
        $actor = [
            'actor_label' => $this->user->email,
            'actor_user_id' => $this->user->id,
        ];
        $needType = in_array(self::ACCOUNTS[$to][2], ['savings', 'couple_savings', 'emergency_fund'], true) ? 'saving' : null;

        $outgoing = $this->createAllocationLeg($from, 'expense', $amount, $at, "Alokasi ke {$destinationName}", $notes, null, [
            'direction' => 'out',
            ...$actor,
            'counterpart_account_id' => $this->accountIds[$to],
            'counterpart_account_name' => $destinationName,
        ]);
        $incoming = $this->createAllocationLeg($to, 'income', $amount, $at->addSeconds(1), "Alokasi dari {$sourceName}", $notes, $needType, [
            'direction' => 'in',
            ...$actor,
            'counterpart_account_id' => $this->accountIds[$from],
            'counterpart_account_name' => $sourceName,
            'counterpart_transaction_id' => $outgoing->id,
        ]);

        // Written raw so the back-reference does not touch updated_at.
        DB::table('transactions')->where('id', $outgoing->id)->update(['metadata' => json_encode([
            ...$outgoing->metadata,
            'counterpart_transaction_id' => $incoming->id,
        ])]);

        $this->balance[$from] -= $amount;
        $this->balance[$to] += $amount;

        if ($splits !== []) {
            DB::table('transactions')->where('id', $incoming->id)->update(['saving_goal_id' => $this->goals[array_key_first($splits)]->id]);
            foreach ($splits as $goal => $share) {
                $this->goalEntry($goal, 'deposit', $share, $at, $notes, $incoming->id);
            }
        }
    }

    /** @param array<string, mixed> $metadata */
    private function createAllocationLeg(string $account, string $type, int $amount, CarbonImmutable $at, string $description, string $notes, ?string $needType, array $metadata): Transaction
    {
        $transaction = new Transaction([
            'user_id' => $this->user->id,
            'account_id' => $this->accountIds[$account],
            'transaction_type' => $type,
            'amount' => $amount,
            'need_type' => $needType,
            'transaction_date' => $at->toDateString(),
            'occurred_at' => $at->utc(),
            'description' => $description,
            'notes' => $notes,
            'source' => 'account_allocation',
            'metadata' => $metadata,
        ]);
        $transaction->created_at = $at->utc();
        $transaction->updated_at = $at->utc();
        $transaction->save();

        return $transaction;
    }

    // --- derived records ---------------------------------------------------------------------

    private function finishAccounts(): void
    {
        foreach ($this->accountIds as $key => $id) {
            if ($this->balance[$key] < 0) {
                throw new LogicException("{$key} ended negative: {$this->balance[$key]}");
            }

            FinancialAccount::query()->whereKey($id)->update(['current_balance' => round($this->balance[$key], 2)]);
        }
    }

    private function finishGoals(): void
    {
        foreach ($this->goals as $goal) {
            $saved = (float) DB::table('saving_goal_entries')->where('saving_goal_id', $goal->id)->sum('amount');
            $goal->forceFill(['current_amount' => $saved])->saveQuietly();
        }
    }

    private function finishBills(): void
    {
        foreach ($this->bills as $key => $bill) {
            [, , $estimate, $dueDay] = self::BILLS[$key];
            $nextDue = null;

            for ($month = $this->start->startOfMonth(); $month->lessThanOrEqualTo($this->today->addMonthNoOverflow()); $month = $month->addMonthNoOverflow()) {
                $due = $month->setDay(min($dueDay, $month->daysInMonth));
                if ($due->lessThan($this->start)) {
                    continue;
                }

                $paid = $this->paidBills[$key][$due->format('Y-m')] ?? null;

                if ($paid) {
                    DB::table('bill_payments')->insert([
                        'bill_id' => $bill->id,
                        'transaction_id' => $paid['transaction_id'],
                        'period_month' => $month->toDateString(),
                        'due_date' => $due->toDateString(),
                        'amount_due' => $paid['amount'],
                        'amount_paid' => $paid['amount'],
                        'paid_at' => CarbonImmutable::parse($paid['date'], self::TZ)->setTime(10, 0)->utc(),
                        'status' => $paid['late'] ? 'late' : 'paid',
                        'created_at' => $due->subDays(5)->utc(),
                        'updated_at' => CarbonImmutable::parse($paid['date'])->utc(),
                    ]);

                    continue;
                }

                // Only the coming obligation is tracked as unpaid; later months have not started.
                if ($due->greaterThanOrEqualTo($this->today) && $nextDue === null) {
                    $nextDue = $due;
                    DB::table('bill_payments')->insert([
                        'bill_id' => $bill->id,
                        'transaction_id' => null,
                        'period_month' => $month->toDateString(),
                        'due_date' => $due->toDateString(),
                        'amount_due' => $estimate,
                        'amount_paid' => null,
                        'paid_at' => null,
                        'status' => 'unpaid',
                        'created_at' => $due->subDays(10)->utc(),
                        'updated_at' => $due->subDays(10)->utc(),
                    ]);
                }
            }

            $bill->forceFill(['next_due_date' => ($nextDue ?? $this->nextOccurrence($dueDay))->toDateString()])->saveQuietly();
        }
    }

    private function seedPaydayEvents(): void
    {
        foreach ($this->paydays as $cycle => $nominal) {
            $received = $nominal->lessThanOrEqualTo($this->today) || $this->payDate($nominal)->lessThanOrEqualTo($this->today);
            $salary = $this->salaryFor(min($cycle, 0));

            PaydayEvent::query()->create([
                'user_id' => $this->user->id,
                'expected_date' => $nominal->toDateString(),
                'paid_date' => $received ? $this->payDate($nominal)->toDateString() : null,
                'expected_amount' => $salary,
                'received_amount' => $received ? $salary : null,
                'status' => $received ? 'received' : 'expected',
            ]);
        }
    }

    private function totalBefore(CarbonImmutable $date): float
    {
        $total = $this->openingTotal;
        foreach ($this->totalAfter as $day => $amount) {
            if ($day >= $date->toDateString()) {
                break;
            }
            $total = $amount;
        }

        return $total;
    }

    private function seedPeriods(): void
    {
        foreach ($this->paydays as $cycle => $nominal) {
            $end = $this->nominalPayday($nominal->addMonthNoOverflow())->subDay();
            $isCurrent = $cycle === 0;
            $status = $cycle < 0 ? 'closed' : ($isCurrent ? 'active' : 'planned');
            $salary = $this->salaryFor(min($cycle, 0));

            FinancialPeriod::query()->create([
                'user_id' => $this->user->id,
                'name' => sprintf('Periode gajian %s %d', self::MONTHS_SHORT[$nominal->month], $nominal->year),
                'start_date' => $nominal->toDateString(),
                'end_date' => $end->toDateString(),
                'payday_date' => $nominal->toDateString(),
                'opening_balance' => max(round($this->totalBefore($nominal), 2), 0),
                'income_target' => $salary,
                'expense_limit' => 5_900_000,
                'status' => $status,
                'notes' => match ($status) {
                    'closed' => 'Periode selesai.',
                    'active' => 'Periode berjalan. Batas harian aman Rp85.000.',
                    default => 'Direncanakan dengan pola alokasi yang sama.',
                },
            ]);
        }
    }

    private function seedBudgets(): void
    {
        $firstFullMonth = $this->start->startOfMonth()->addMonthNoOverflow();

        for ($month = $firstFullMonth; $month->lessThanOrEqualTo($this->today); $month = $month->addMonthNoOverflow()) {
            $isCurrent = $month->format('Y-m') === $this->today->format('Y-m');
            $income = $month->lessThan($this->paydays[-2]->startOfMonth()) ? self::SALARY_BEFORE_RAISE : self::SALARY_AFTER_RAISE;

            $budget = Budget::query()->create([
                'user_id' => $this->user->id,
                'month' => $month->toDateString(),
                'planned_income' => $income,
                'planned_expense' => array_sum(self::BUDGET),
                'daily_safe_amount' => 85_000,
                'status' => $isCurrent ? 'active' : 'closed',
            ]);

            $spent = Transaction::query()
                ->where('user_id', $this->user->id)
                ->where('transaction_type', 'expense')
                ->whereBetween('transaction_date', [$month->toDateString(), $month->endOfMonth()->toDateString()])
                ->groupBy('category_id')
                ->selectRaw('category_id, sum(amount) as total')
                ->pluck('total', 'category_id');

            foreach (self::BUDGET as $slug => $allocated) {
                $category = $this->categories[$slug];
                $budget->categories()->create([
                    'category_id' => $category->id,
                    'allocated_amount' => $allocated,
                    'spent_amount_cache' => round((float) ($spent[$category->id] ?? 0), 2),
                    'allocation_percent' => (int) round($allocated / $income * 100),
                ]);
            }
        }
    }

    private function seedMonthlyReports(): void
    {
        $service = app(MonthlyReportService::class);
        $user = $this->user->fresh('profile');

        for ($month = $this->start->startOfMonth()->addMonthNoOverflow(); $month->lessThanOrEqualTo($this->today); $month = $month->addMonthNoOverflow()) {
            $service->generate($user, $month);
        }
    }

    private function seedInsights(): void
    {
        $cycleStart = $this->paydays[0];
        $previousStart = $this->paydays[-1];

        $spend = fn (CarbonImmutable $from, CarbonImmutable $to) => (float) Transaction::query()
            ->where('user_id', $this->user->id)
            ->where('transaction_type', 'expense')
            ->whereNull('source')
            ->whereBetween('transaction_date', [$from->toDateString(), $to->toDateString()])
            ->sum('amount');

        $lastCycle = $spend($previousStart, $cycleStart->subDay());
        $cycleBefore = $spend($this->paydays[-2], $previousStart->subDay());
        $change = $cycleBefore > 0 ? round(($lastCycle - $cycleBefore) / $cycleBefore * 100, 1) : 0.0;

        $lastMonth = $this->today->startOfMonth()->subMonthNoOverflow();
        $budget = Budget::query()->where('user_id', $this->user->id)->whereDate('month', $lastMonth)->with('categories.category')->first();
        $worst = $budget?->categories
            ->map(fn ($row) => [
                'name' => $row->category->name,
                'allocated' => (float) $row->allocated_amount,
                'spent' => (float) $row->spent_amount_cache,
                'usage' => $row->allocated_amount > 0 ? round($row->spent_amount_cache / $row->allocated_amount * 100, 1) : 0.0,
            ])
            ->sortByDesc('usage')
            ->first();

        $emergency = $this->goals['darurat']->fresh();
        $emergencyPercent = round((float) $emergency->current_amount / (float) $emergency->target_amount * 100, 1);

        $unpaid = DB::table('bill_payments')
            ->join('bills', 'bills.id', '=', 'bill_payments.bill_id')
            ->where('bills.user_id', $this->user->id)
            ->where('bill_payments.status', 'unpaid')
            ->whereDate('bill_payments.due_date', '<', $cycleStart->addMonthNoOverflow()->toDateString())
            ->selectRaw('count(*) as total, coalesce(sum(bill_payments.amount_due), 0) as amount')
            ->first();

        $sideIncome = (float) Transaction::query()
            ->where('user_id', $this->user->id)
            ->where('transaction_type', 'income')
            ->whereIn('category_id', [$this->categories['freelance']->id, $this->categories['lembur']->id])
            ->sum('amount');

        $insights = [];

        if ($worst) {
            $over = $worst['usage'] >= 100;
            $insights[] = [
                'type' => 'budget_warning',
                'severity' => $over ? 'danger' : ($worst['usage'] >= 80 ? 'warning' : 'info'),
                'title' => "Budget {$worst['name']} {$this->monthLabel($lastMonth)} ".($over ? 'terlampaui' : 'hampir habis'),
                'message' => sprintf(
                    'Pengeluaran %s bulan lalu %s dari budget %s (%s%%). Pertimbangkan menurunkan frekuensinya bulan ini.',
                    $worst['name'],
                    $this->rupiah($worst['spent']),
                    $this->rupiah($worst['allocated']),
                    rtrim(rtrim(number_format($worst['usage'], 1, '.', ''), '0'), '.'),
                ),
                'payload' => $worst,
                'month' => $lastMonth,
                'status' => 'active',
                'age' => 3,
            ];
        }

        $insights[] = [
            'type' => 'spending_trend',
            'severity' => $change > 8 ? 'warning' : 'info',
            'title' => 'Pengeluaran siklus gajian lalu '.($change >= 0 ? 'naik' : 'turun').' '.abs($change).'%',
            'message' => sprintf(
                'Dari %s ke %s kamu menghabiskan %s, dibanding %s di siklus sebelumnya. Alokasi antar-rekening tidak dihitung.',
                $previousStart->day.' '.self::MONTHS_SHORT[$previousStart->month],
                $cycleStart->subDay()->day.' '.self::MONTHS_SHORT[$cycleStart->subDay()->month],
                $this->rupiah($lastCycle),
                $this->rupiah($cycleBefore),
            ),
            'payload' => ['current_cycle' => $lastCycle, 'previous_cycle' => $cycleBefore, 'change_percent' => $change],
            'month' => $cycleStart->startOfMonth(),
            'status' => 'active',
            'age' => 8,
        ];

        $insights[] = [
            'type' => 'saving_milestone',
            'severity' => 'success',
            'title' => "Dana darurat sudah {$emergencyPercent}% dari target",
            'message' => sprintf(
                'Saldo dana darurat %s dari target %s. Setoran %s tiap gajian membuat targetnya tercapai sekitar %d bulan lagi.',
                $this->rupiah($emergency->current_amount),
                $this->rupiah($emergency->target_amount),
                $this->rupiah(500_000),
                (int) ceil(((float) $emergency->target_amount - (float) $emergency->current_amount) / 500_000),
            ),
            'payload' => ['goal_id' => $emergency->id, 'progress_percent' => $emergencyPercent],
            'month' => $this->today->startOfMonth(),
            'status' => 'read',
            'age' => 12,
        ];

        if ($unpaid && $unpaid->total > 0) {
            $insights[] = [
                'type' => 'bill_reminder',
                'severity' => 'warning',
                'title' => "{$unpaid->total} tagihan jatuh tempo sebelum gajian",
                'message' => sprintf('Siapkan %s di Kantong Tagihan untuk tagihan yang belum dibayar sampai gajian berikutnya.', $this->rupiah($unpaid->amount)),
                'payload' => ['count' => (int) $unpaid->total, 'amount' => (float) $unpaid->amount],
                'month' => $this->today->startOfMonth(),
                'status' => 'active',
                'age' => 1,
            ];
        }

        $insights[] = [
            'type' => 'income_diversification',
            'severity' => 'success',
            'title' => 'Penghasilan sampingan membantu arus kas',
            'message' => sprintf('Dalam %d siklus gajian terakhir, freelance dan lembur menambah %s di luar gaji.', self::CYCLES_BACK, $this->rupiah($sideIncome)),
            'payload' => ['side_income' => $sideIncome],
            'month' => $this->today->startOfMonth(),
            'status' => 'read',
            'age' => 20,
        ];

        $insights[] = [
            'type' => 'wishlist_waiting',
            'severity' => 'info',
            'title' => 'Keyboard mekanik masih masa tunggu',
            'message' => 'Masa tunggu 14 hari belum selesai. Kalau setelah itu masih kepengin dan saldo tagihan aman, baru dibeli.',
            'payload' => ['wishlist_id' => $this->wishlists['keyboard']->id],
            'month' => $this->today->startOfMonth(),
            'status' => 'active',
            'age' => 2,
        ];

        $insights[] = [
            'type' => 'budget_warning',
            'severity' => 'warning',
            'title' => 'Jajan dan kopi sempat menembus budget',
            'message' => 'Pengeluaran jajan pernah melewati 80% budget sebelum pertengahan bulan. Insight ini sudah ditutup.',
            'payload' => ['category' => 'Jajan'],
            'month' => $this->today->startOfMonth()->subMonthsNoOverflow(3),
            'status' => 'dismissed',
            'age' => 70,
        ];

        foreach ($insights as $insight) {
            $age = $insight['age'];
            unset($insight['age']);
            $created = $this->now->subDays($age)->subHours(mt_rand(0, 6));

            $record = new FinancialInsight([
                ...$insight,
                'user_id' => $this->user->id,
                'month' => $insight['month']->toDateString(),
                'read_at' => $insight['status'] === 'active' ? null : $created->addHours(5),
            ]);
            $record->created_at = $created;
            $record->updated_at = $created;
            $record->save();
        }
    }
}
