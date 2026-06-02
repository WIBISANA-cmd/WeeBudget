# WeeB Laravel API Design

## Struktur Folder

```text
app/
  Http/
    Concerns/RespondsWithApi.php
    Controllers/Api/
    Requests/Auth/
    Requests/Profile/
    Requests/Finance/
    Resources/
  Models/
  Services/Finance/
database/
  migrations/
  seeders/
routes/
  api.php
```

## Format Response

Success:

```json
{
  "success": true,
  "message": "Expense created.",
  "data": {
    "id": 1,
    "transaction_type": "expense",
    "amount": "25000.00"
  }
}
```

Pagination:

```json
{
  "success": true,
  "message": "Expenses loaded.",
  "data": [],
  "meta": {
    "current_page": 1,
    "from": 1,
    "last_page": 3,
    "per_page": 20,
    "to": 20,
    "total": 52
  }
}
```

Validation error:

```json
{
  "success": false,
  "message": "Validation failed.",
  "data": null,
  "errors": {
    "amount": ["The amount field is required."]
  }
}
```

## Route API

WeeB saat ini berjalan sebagai aplikasi single-user tanpa login. Backend tetap membuat user default internal agar semua tabel finansial tetap punya `user_id` dan mudah dikembangkan lagi kalau suatu hari login dibutuhkan.

Public single-user routes:

| Method | URI | Keterangan |
| --- | --- | --- |
| GET/PATCH/PUT | `/api/profile` | User dan financial profile |
| GET | `/api/dashboard` | Dashboard summary |
| GET | `/api/payday-simulation` | Simulasi sisa uang sampai gajian |
| GET | `/api/health-score` | Skor kesehatan finansial |
| GET | `/api/insights` | Insight tersimpan dan live insight |
| GET | `/api/reports/monthly` | List laporan bulanan |
| GET | `/api/reports/monthly/current?month=2026-05-01` | Generate/show laporan bulan tertentu |
| GET | `/api/statistics/expenses/categories?month=2026-05-01` | Statistik pengeluaran per kategori |
| GET | `/api/budget-alerts?month=2026-05-01` | Deteksi budget terlampaui |
| API Resource | `/api/categories` | CRUD kategori |
| API Resource | `/api/incomes` | CRUD pemasukan |
| API Resource | `/api/expenses` | CRUD pengeluaran |
| API Resource | `/api/budgets` | CRUD budget bulanan |
| API Resource | `/api/saving-goals` | CRUD target tabungan |
| API Resource | `/api/emergency-funds` | CRUD dana darurat |
| API Resource | `/api/bills` | CRUD reminder tagihan |
| API Resource | `/api/recurring-transactions` | CRUD transaksi rutin |
| API Resource | `/api/wishlists` | CRUD wishlist kebutuhan/keinginan |

## Controller

- `ProfileController`
- `CategoryController`
- `IncomeController`
- `ExpenseController`
- `BudgetController`
- `SavingGoalController`
- `EmergencyFundController`
- `BillController`
- `RecurringTransactionController`
- `WishlistController`
- `DashboardController`
- `MonthlyReportController`
- `InsightController`
- `HealthScoreController`
- `ExpenseStatisticController`
- `PaydaySimulationController`
- `BudgetAlertController`

## Form Request

- `UpdateProfileRequest`
- `StoreCategoryRequest`, `UpdateCategoryRequest`
- `StoreTransactionRequest`, `UpdateTransactionRequest`
- `StoreBudgetRequest`, `UpdateBudgetRequest`
- `StoreSavingGoalRequest`, `UpdateSavingGoalRequest`
- `StoreBillRequest`, `UpdateBillRequest`
- `StoreRecurringTransactionRequest`, `UpdateRecurringTransactionRequest`
- `StoreWishlistRequest`, `UpdateWishlistRequest`

## Service Class

- `PaydaySimulationService`: menghitung tanggal gajian berikutnya, tagihan dekat, uang aman harian.
- `HealthScoreService`: skor 0-100 berbasis payday status, dana darurat, rasio pengeluaran, dan pengeluaran keinginan.
- `FinanceSummaryService`: data dashboard.
- `MonthlyReportService`: generate snapshot laporan bulanan.
- `ExpenseStatisticService`: agregasi pengeluaran per kategori.
- `BudgetAlertService`: deteksi kategori yang warning/exceeded.

## Resource Class

- `UserResource`
- `UserProfileResource`
- `CategoryResource`
- `TransactionResource`
- `BudgetResource`
- `SavingGoalResource`
- `BillResource`
- `RecurringTransactionResource`
- `WishlistResource`
- `MonthlyReportResource`
- `FinancialInsightResource`

## Model dan Migration

Model utama:

- `User`, `UserProfile`
- `FinancialAccount`
- `TransactionCategory`
- `Transaction`
- `Budget`, `BudgetCategory`
- `SavingGoal`
- `Bill`
- `RecurringTransaction`
- `PaydayEvent`
- `Wishlist`
- `MonthlyReport`
- `FinancialInsight`

Migration utama:

- `create_users_table`
- `create_personal_access_tokens_table`
- `create_user_profiles_table`
- `create_finance_core_tables`

## Seeder Default

- `TransactionCategorySeeder`

Seeder ini membuat kategori default yang relevan untuk user gaji UMR: gaji, lembur, makan, transport, kos, pulsa/internet, cicilan, keluarga, jajan, tabungan, dana darurat, dan lainnya.

## Filter Query yang Didukung

Transaksi:

- `category_id`
- `need_type`
- `date_from`
- `date_to`
- `per_page`

Kategori:

- `transaction_type`
- `need_type`
- `per_page`

Budget, bills, saving goals, recurring transactions, wishlist:

- `status`
- `type` untuk saving goals
- `transaction_type` untuk recurring transactions
- `need_type` untuk wishlist
- `per_page`
