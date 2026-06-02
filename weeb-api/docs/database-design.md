# WeeB Database Design

Target: PostgreSQL untuk Laravel API + React frontend, production-grade untuk aplikasi kecil sampai menengah.

Prinsip desain:

- `transactions` adalah source of truth untuk pemasukan dan pengeluaran.
- Tabel ringkasan seperti `monthly_reports`, `budget_categories.spent_amount_cache`, dan `financial_insights` boleh di-regenerate dari transaksi.
- Semua data finansial user selalu punya `user_id`, kecuali kategori default yang `user_id = null`.
- Nominal uang memakai `decimal(14,2)`, bukan floating point.
- Soft delete dipakai untuk data yang user mungkin salah hapus dan masih bernilai historis.

## Daftar Tabel

| Tabel | Fungsi | Soft delete |
| --- | --- | --- |
| `users` | Akun login Laravel/Sanctum | Tidak |
| `user_profiles` | Preferensi finansial user, tanggal gajian, estimasi gaji | Tidak |
| `financial_accounts` | Kantong uang sederhana: cash, bank, e-wallet | Ya |
| `transaction_categories` | Kategori default dan custom | Ya |
| `transactions` | Pemasukan/pengeluaran aktual | Ya |
| `budgets` | Header budget bulanan | Tidak |
| `budget_categories` | Alokasi budget per kategori | Tidak |
| `saving_goals` | Target tabungan dan dana darurat | Ya |
| `saving_goal_entries` | Riwayat setoran/penarikan target | Tidak |
| `bills` | Master tagihan tetap/berulang | Ya |
| `bill_payments` | Status pembayaran tagihan per periode | Tidak |
| `recurring_transactions` | Template transaksi rutin | Ya |
| `payday_events` | Tracking tanggal dan nominal gajian | Tidak |
| `wishlists` | Wishlist tertahan untuk kebutuhan/keinginan | Ya |
| `monthly_reports` | Snapshot evaluasi bulanan | Tidak |
| `financial_insights` | Insight otomatis dan health alert | Tidak |

## Struktur Tabel

### `user_profiles`

| Kolom | Tipe | Wajib | Catatan |
| --- | --- | --- | --- |
| `id` | bigint | Ya | PK |
| `user_id` | bigint | Ya | FK unique ke `users` |
| `currency` | string(3) | Ya | Default `IDR` |
| `timezone` | string | Ya | Default `Asia/Jakarta` |
| `payday_day` | tinyint | Tidak | 1-31 |
| `payday_frequency` | string | Ya | `weekly`, `biweekly`, `monthly` |
| `monthly_income_estimate` | decimal(14,2) | Tidak | Estimasi gaji |
| `daily_safe_amount_target` | decimal(14,2) | Tidak | Target uang aman harian |
| `onboarding_completed_at` | date | Tidak | Status onboarding |
| `created_at`, `updated_at` | timestamp | Ya | Laravel default |

Alasan: data payday dan target harian sering dipakai di dashboard, jadi disimpan dekat profil.

### `financial_accounts`

| Kolom | Tipe | Wajib | Catatan |
| --- | --- | --- | --- |
| `id` | bigint | Ya | PK |
| `user_id` | bigint | Ya | FK |
| `name` | string(80) | Ya | Contoh: Cash, BCA, GoPay |
| `type` | string(20) | Ya | `cash`, `bank`, `ewallet`, `other` |
| `opening_balance` | decimal(14,2) | Ya | Saldo awal |
| `current_balance` | decimal(14,2) | Ya | Cache saldo sekarang |
| `is_default` | boolean | Ya | Akun utama input cepat |
| `is_active` | boolean | Ya | Sembunyikan akun lama |

Index:

- `user_id, is_active`
- `user_id, type`

Alasan: walau MVP bisa satu saldo, account sederhana membuat cash/e-wallet siap tanpa redesign.

### `transaction_categories`

| Kolom | Tipe | Wajib | Catatan |
| --- | --- | --- | --- |
| `id` | bigint | Ya | PK |
| `user_id` | bigint | Tidak | Null untuk kategori default sistem |
| `name` | string(80) | Ya | Nama kategori |
| `slug` | string(100) | Ya | Stabil untuk API |
| `transaction_type` | string(20) | Ya | `income`, `expense`, `both` |
| `need_type` | string(20) | Tidak | `need`, `want`, `saving`, `debt` |
| `icon` | string(60) | Tidak | Nama icon frontend |
| `color` | string(20) | Tidak | Hex/token |
| `is_default` | boolean | Ya | Kategori bawaan |
| `sort_order` | smallint | Ya | Urutan UI |

Constraint:

- Unique `user_id, slug, transaction_type`

Alasan: kategori default tidak perlu diduplikasi ke setiap user. User custom tetap bisa dibuat.

### `transactions`

| Kolom | Tipe | Wajib | Catatan |
| --- | --- | --- | --- |
| `id` | bigint | Ya | PK |
| `user_id` | bigint | Ya | FK |
| `account_id` | bigint | Tidak | FK ke kantong uang |
| `category_id` | bigint | Tidak | FK kategori |
| `recurring_transaction_id` | bigint | Tidak | Asal template rutin |
| `bill_id` | bigint | Tidak | Jika transaksi membayar tagihan |
| `saving_goal_id` | bigint | Tidak | Jika transaksi setoran target |
| `wishlist_id` | bigint | Tidak | Jika pembelian dari wishlist |
| `transaction_type` | string(20) | Ya | `income`, `expense` |
| `amount` | decimal(14,2) | Ya | Harus > 0 |
| `need_type` | string(20) | Tidak | Snapshot kebutuhan/keinginan |
| `transaction_date` | date | Ya | Untuk laporan |
| `occurred_at` | timestamp | Tidak | Untuk input detail |
| `description` | string(160) | Tidak | Label pendek |
| `notes` | text | Tidak | Catatan user |
| `source` | string(80) | Tidak | Gaji, lembur, marketplace, dll |
| `metadata` | json | Tidak | Data fleksibel non-kritis |

Index penting:

- `user_id, transaction_date`
- `user_id, transaction_type, transaction_date`
- `user_id, category_id, transaction_date`
- `user_id, need_type, transaction_date`

Alasan: hampir semua dashboard dan laporan memfilter transaksi per user, bulan, tipe, kategori.

### `budgets`

| Kolom | Tipe | Wajib | Catatan |
| --- | --- | --- | --- |
| `id` | bigint | Ya | PK |
| `user_id` | bigint | Ya | FK |
| `month` | date | Ya | Simpan tanggal awal bulan |
| `planned_income` | decimal(14,2) | Ya | Rencana pemasukan |
| `planned_expense` | decimal(14,2) | Ya | Rencana pengeluaran |
| `daily_safe_amount` | decimal(14,2) | Tidak | Hasil simulasi saat budget dibuat |
| `status` | string(20) | Ya | `draft`, `active`, `closed` |

Constraint:

- Unique `user_id, month`

### `budget_categories`

| Kolom | Tipe | Wajib | Catatan |
| --- | --- | --- | --- |
| `id` | bigint | Ya | PK |
| `budget_id` | bigint | Ya | FK |
| `category_id` | bigint | Ya | FK |
| `allocated_amount` | decimal(14,2) | Ya | Budget kategori |
| `spent_amount_cache` | decimal(14,2) | Ya | Cache untuk dashboard |
| `allocation_percent` | tinyint | Tidak | 0-100 |

Constraint:

- Unique `budget_id, category_id`

Alasan: pemisahan header/detail menjaga budget bulanan fleksibel.

### `saving_goals`

| Kolom | Tipe | Wajib | Catatan |
| --- | --- | --- | --- |
| `id` | bigint | Ya | PK |
| `user_id` | bigint | Ya | FK |
| `name` | string(120) | Ya | Nama target |
| `type` | string(30) | Ya | `saving`, `emergency_fund`, `wishlist` |
| `target_amount` | decimal(14,2) | Ya | Harus > 0 |
| `current_amount` | decimal(14,2) | Ya | Cache progress |
| `target_date` | date | Tidak | Deadline opsional |
| `priority` | tinyint | Ya | 1 tertinggi |
| `status` | string(20) | Ya | `active`, `paused`, `completed`, `cancelled` |

Alasan: dana darurat cukup sebagai tipe dari target tabungan, tidak perlu tabel sendiri.

### `saving_goal_entries`

Mencatat riwayat setoran, penarikan, dan adjustment. `current_amount` di `saving_goals` adalah cache.

Kolom penting: `saving_goal_id`, `transaction_id`, `entry_type`, `amount`, `entry_date`.

### `bills`

Master tagihan seperti kos, internet, cicilan motor, listrik.

Kolom penting:

- `user_id`
- `category_id`
- `name`
- `amount_estimate`
- `due_day`
- `next_due_date`
- `frequency`
- `reminder_days`
- `status`

Index:

- `user_id, status, next_due_date`

### `bill_payments`

Satu baris untuk satu periode tagihan.

Kolom penting:

- `bill_id`
- `transaction_id`
- `period_month`
- `due_date`
- `amount_due`
- `amount_paid`
- `paid_at`
- `status`

Constraint:

- Unique `bill_id, period_month`

Alasan: master tagihan dan pembayaran dipisah agar bisa melacak telat/lunas per bulan.

### `recurring_transactions`

Template transaksi berulang, misalnya gaji, langganan, transport, kirim uang keluarga.

Kolom penting:

- `user_id`
- `account_id`
- `category_id`
- `name`
- `transaction_type`
- `amount`
- `frequency`
- `day_of_month`
- `next_run_date`
- `status`

### `payday_events`

Tracking payday aktual.

Kolom penting:

- `expected_date`
- `paid_date`
- `expected_amount`
- `received_amount`
- `status`

Alasan: profil menyimpan aturan payday, tabel ini menyimpan kejadian gajian aktual untuk laporan.

### `wishlists`

Wishlist tertahan untuk membedakan kebutuhan dan keinginan.

Kolom penting:

- `name`
- `estimated_amount`
- `need_type`
- `waiting_days`
- `waiting_until`
- `status`
- `impact_snapshot`

`impact_snapshot` menyimpan hasil simulasi saat wishlist dibuat, misalnya sisa uang harian sebelum/sesudah beli.

### `monthly_reports`

Snapshot bulanan untuk laporan cepat.

Kolom penting:

- `month`
- `total_income`
- `total_expense`
- `total_saving`
- `remaining_amount`
- `financial_health_score`
- `summary`
- `generated_at`

Alasan: laporan bulanan bisa dihitung ulang, tetapi snapshot mempercepat dashboard historis.

### `financial_insights`

Insight otomatis seperti bocor uang, tagihan dekat, uang tidak cukup sampai gajian.

Kolom penting:

- `month`
- `type`
- `severity`
- `title`
- `message`
- `payload`
- `status`
- `read_at`

## ERD

```text
users
  1 ── 1 user_profiles
  1 ── * financial_accounts
  1 ── * transaction_categories
  1 ── * transactions
  1 ── * budgets
  1 ── * saving_goals
  1 ── * bills
  1 ── * recurring_transactions
  1 ── * payday_events
  1 ── * wishlists
  1 ── * monthly_reports
  1 ── * financial_insights

transaction_categories
  1 ── * transactions
  1 ── * budget_categories
  1 ── * bills
  1 ── * recurring_transactions

financial_accounts
  1 ── * transactions
  1 ── * recurring_transactions

budgets
  1 ── * budget_categories

saving_goals
  1 ── * saving_goal_entries
  1 ── * transactions

bills
  1 ── * bill_payments
  1 ── * transactions

recurring_transactions
  1 ── * transactions

wishlists
  1 ── * transactions

transactions
  1 ── 0..1 bill_payments
  1 ── 0..1 saving_goal_entries
```

## Migration Planning

Urutan migration yang direkomendasikan:

1. `users`, `password_reset_tokens`, `sessions`
2. `personal_access_tokens`
3. `user_profiles`
4. `financial_accounts`
5. `transaction_categories`
6. `budgets`
7. `budget_categories`
8. `saving_goals`
9. `bills`
10. `recurring_transactions`
11. `payday_events`
12. `wishlists`
13. `transactions`
14. `saving_goal_entries`
15. `bill_payments`
16. `monthly_reports`
17. `financial_insights`
18. Seeder kategori default

Saat ini implementasi migration inti ada di:

- `database/migrations/2026_05_29_172017_create_user_profiles_table.php`
- `database/migrations/2026_05_30_000001_create_finance_core_tables.php`

## Kategori Default yang Disarankan

Expense:

- makan
- transport
- kos-kontrakan
- pulsa-internet
- listrik-air
- cicilan
- keluarga
- kesehatan
- belanja-rumah
- jajan
- hiburan
- tabungan
- dana-darurat
- utang
- lainnya

Income:

- gaji
- lembur
- bonus
- freelance
- jualan
- bantuan
- lainnya

## Catatan Soft Delete

Gunakan soft delete untuk:

- `financial_accounts`
- `transaction_categories`
- `transactions`
- `saving_goals`
- `bills`
- `recurring_transactions`
- `wishlists`

Jangan soft delete untuk:

- `budget_categories`
- `bill_payments`
- `saving_goal_entries`
- `monthly_reports`
- `financial_insights`

Alasan: tabel riwayat/evaluasi lebih baik immutable atau di-regenerate, sedangkan data input user perlu bisa dipulihkan.

## Query Laporan yang Didukung

Total pengeluaran bulanan:

```sql
select sum(amount)
from transactions
where user_id = :user_id
  and transaction_type = 'expense'
  and transaction_date >= :month_start
  and transaction_date < :next_month_start
  and deleted_at is null;
```

Pengeluaran per kategori:

```sql
select category_id, sum(amount) as total
from transactions
where user_id = :user_id
  and transaction_type = 'expense'
  and transaction_date >= :month_start
  and transaction_date < :next_month_start
  and deleted_at is null
group by category_id
order by total desc;
```

Simulasi uang aman harian:

```text
uang_tersedia = sum(financial_accounts.current_balance where active)
tagihan_belum_bayar = sum(bill_payments.amount_due where status unpaid and due_date <= next_payday)
sisa_bersih = uang_tersedia - tagihan_belum_bayar
uang_aman_harian = floor(sisa_bersih / jumlah_hari_sampai_gajian)
```

## Rekomendasi Implementasi

- Buat seeder kategori default sebelum UI transaksi aktif.
- Update `financial_accounts.current_balance`, `budget_categories.spent_amount_cache`, dan `saving_goals.current_amount` lewat service layer setelah create/update/delete transaksi.
- Jangan simpan health score hanya di frontend. Simpan snapshot di `monthly_reports` agar evaluasi historis stabil.
- Gunakan policy/scoping wajib: semua query harus difilter `user_id`.
- Untuk API list transaksi, default filter `transaction_date desc` dan pagination.
