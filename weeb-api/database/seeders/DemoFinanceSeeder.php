<?php

namespace Database\Seeders;

use App\Models\Bill;
use App\Models\Budget;
use App\Models\FinancialAccount;
use App\Models\FinancialPeriod;
use App\Models\RecurringTransaction;
use App\Models\SavingGoal;
use App\Models\Transaction;
use App\Models\TransactionCategory;
use App\Models\User;
use App\Models\Wishlist;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;

class DemoFinanceSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::query()->where('email', env('WEEB_DEFAULT_USER_EMAIL', 'local@weeb.id'))->firstOrFail();
        $today = CarbonImmutable::today();
        $month = $today->startOfMonth();

        $user->update(['name' => 'Teman WeeB']);
        $user->profile()->updateOrCreate(
            ['user_id' => $user->id],
            [
                'currency' => 'IDR',
                'timezone' => 'Asia/Jakarta',
                'payday_day' => 25,
                'payday_frequency' => 'monthly',
                'monthly_income_estimate' => 3200000,
                'daily_safe_amount_target' => 65000,
                'onboarding_completed_at' => $today->toDateString(),
            ],
        );

        $accounts = [
            ['Dompet utama', 'cash', 'daily_spending', 'Tunai', null, 0, 420000, true, 'Dipakai untuk makan, transport, dan kebutuhan harian.'],
            ['Rekening gaji', 'bank', 'salary', 'Bank utama', '**** 1025', 0, 1000000, false, 'Tempat gaji masuk sebelum dibagi ke pos lain.'],
            ['Tabungan service motor', 'digital_bank', 'savings', 'Bank digital', 'Pocket tabungan', 0, 320000, false, 'Pisahkan agar target tabungan tidak tercampur uang harian.'],
            ['Dana darurat', 'digital_bank', 'emergency_fund', 'Bank digital', 'Pocket darurat', 0, 520000, false, 'Jangan dipakai kecuali kondisi mendesak.'],
            ['Rekening tagihan', 'e_wallet', 'bills', 'E-wallet', 'Autodebit', 0, 150000, false, 'Cadangan kecil untuk internet, paket data, dan tagihan rutin.'],
        ];

        $accountMap = [];
        foreach ($accounts as [$name, $type, $purpose, $institution, $identifier, $openingBalance, $currentBalance, $isDefault, $notes]) {
            $acc = FinancialAccount::query()->updateOrCreate(
                ['user_id' => $user->id, 'name' => $name],
                [
                    'type' => $type,
                    'purpose' => $purpose,
                    'institution_name' => $institution,
                    'account_identifier' => $identifier,
                    'opening_balance' => $openingBalance,
                    'current_balance' => $currentBalance,
                    'is_default' => $isDefault,
                    'is_active' => true,
                    'notes' => $notes,
                ],
            );
            $accountMap[$purpose] = $acc->id;
        }

        FinancialPeriod::query()->updateOrCreate(
            ['user_id' => $user->id, 'name' => 'Periode '.$month->translatedFormat('F Y')],
            [
                'start_date' => $month->toDateString(),
                'end_date' => $month->endOfMonth()->toDateString(),
                'payday_date' => $month->setDay(min(25, $month->daysInMonth))->toDateString(),
                'opening_balance' => 1420000,
                'income_target' => 3200000,
                'expense_limit' => 2600000,
                'status' => 'active',
                'notes' => 'Periode contoh untuk memulai perencanaan bulanan.',
            ],
        );

        $category = fn (string $slug) => TransactionCategory::query()->where('slug', $slug)->firstOrFail()->id;

        $transactions = [
            ['Gaji bulanan', 'income', 'gaji', 3200000, $month->addDays(0), null, 'salary'],
            ['Lembur akhir pekan', 'income', 'lembur', 150000, $month->addDays(11), null, 'daily_spending'],
            ['Makan harian', 'expense', 'makan', 42000, $today->subDays(6), 'need', 'daily_spending'],
            ['Transport kerja', 'expense', 'transport', 28000, $today->subDays(5), 'need', 'daily_spending'],
            ['Kopi dan jajan', 'expense', 'jajan', 36000, $today->subDays(4), 'want', 'daily_spending'],
            ['Belanja rumah', 'expense', 'belanja-rumah', 185000, $today->subDays(3), 'need', 'daily_spending'],
            ['Makan siang', 'expense', 'makan', 52000, $today->subDays(2), 'need', 'daily_spending'],
            ['Transport online', 'expense', 'transport', 61000, $today->subDays(1), 'need', 'daily_spending'],
            ['Setoran dana darurat', 'expense', 'dana-darurat', 50000, $today, 'saving', 'daily_spending'],
        ];

        foreach ($transactions as [$description, $type, $slug, $amount, $date, $needType, $accountPurpose]) {
            Transaction::query()->updateOrCreate(
                ['user_id' => $user->id, 'description' => $description, 'transaction_date' => $date->toDateString()],
                [
                    'category_id' => $category($slug),
                    'account_id' => $accountMap[$accountPurpose] ?? null,
                    'transaction_type' => $type,
                    'amount' => $amount,
                    'need_type' => $needType,
                    'source' => $type === 'income' ? 'seed' : null,
                ],
            );
        }

        $budget = Budget::query()->updateOrCreate(
            ['user_id' => $user->id, 'month' => $month->toDateString()],
            ['planned_income' => 3200000, 'planned_expense' => 2600000, 'daily_safe_amount' => 65000, 'status' => 'active'],
        );
        $budget->categories()->delete();
        foreach ([['makan', 850000], ['transport', 420000], ['jajan', 250000], ['belanja-rumah', 450000], ['dana-darurat', 200000]] as [$slug, $amount]) {
            $budget->categories()->create(['category_id' => $category($slug), 'allocated_amount' => $amount]);
        }

        SavingGoal::query()->updateOrCreate(
            ['user_id' => $user->id, 'type' => 'saving', 'name' => 'Service motor'],
            ['target_amount' => 750000, 'current_amount' => 320000, 'target_date' => $today->addMonths(2)->toDateString(), 'priority' => 2, 'status' => 'active'],
        );
        SavingGoal::query()->updateOrCreate(
            ['user_id' => $user->id, 'type' => 'emergency_fund'],
            ['name' => 'Dana darurat', 'target_amount' => 1000000, 'current_amount' => 520000, 'priority' => 1, 'status' => 'active'],
        );

        foreach ([['Internet rumah', 150000, 1], ['Cicilan motor', 685000, 3], ['Paket data', 75000, 8]] as [$name, $amount, $days]) {
            Bill::query()->updateOrCreate(
                ['user_id' => $user->id, 'name' => $name],
                ['category_id' => $category('pulsa-internet'), 'amount_estimate' => $amount, 'due_day' => $today->addDays($days)->day, 'next_due_date' => $today->addDays($days)->toDateString(), 'frequency' => 'monthly', 'reminder_days' => [3, 1, 0], 'status' => 'active'],
            );
        }

        RecurringTransaction::query()->updateOrCreate(
            ['user_id' => $user->id, 'name' => 'Gaji bulanan'],
            ['category_id' => $category('gaji'), 'transaction_type' => 'income', 'amount' => 3200000, 'frequency' => 'monthly', 'day_of_month' => 25, 'next_run_date' => $today->day <= 25 ? $today->setDay(25)->toDateString() : $today->addMonthNoOverflow()->setDay(25)->toDateString(), 'status' => 'active'],
        );

        foreach ([['Sepatu kerja', 280000, 'need', 'medium'], ['Headset bluetooth', 175000, 'want', 'low']] as [$name, $amount, $type, $priority]) {
            Wishlist::query()->updateOrCreate(
                ['user_id' => $user->id, 'name' => $name],
                ['estimated_amount' => $amount, 'need_type' => $type, 'waiting_days' => 7, 'waiting_until' => $today->addDays(7)->toDateString(), 'status' => 'waiting', 'notes' => "Prioritas {$priority}"],
            );
        }
    }
}
