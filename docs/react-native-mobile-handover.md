# WeeB React Native Mobile Handover

Dokumen ini merangkum kondisi aktual project `WeeB` saat ini sebagai referensi teknis untuk membangun versi mobile dengan React Native.

Tujuan dokumen:

- memberi gambaran menyeluruh tentang arsitektur aplikasi web yang sudah ada
- memetakan fitur, layar, data, dan endpoint yang perlu dibawa ke mobile
- menjelaskan keputusan porting dari web/PWA ke React Native
- mengurangi asumsi yang salah saat implementasi mobile dimulai

## 1. Ringkasan Project

WeeB adalah aplikasi manajemen keuangan pribadi dan pasangan dengan fokus pada:

- pencatatan rekening dan transaksi
- pemisahan kebutuhan, keinginan, tabungan, dan cicilan
- budget dan budget planner
- tabungan, dana darurat, dan tabungan berdua
- laporan bulanan dan insight
- reminder transaksi dan push notification

Repository ini terdiri dari dua aplikasi utama:

- `weeb-ui`: frontend React + Vite + Tailwind + PWA
- `weeb-api`: backend Laravel API

## 2. Kondisi Aktual Kode

Beberapa dokumen lama di repo sudah tidak sepenuhnya sinkron dengan implementasi terbaru. Untuk mobile, ikuti kondisi kode aktual berikut:

- backend saat ini memakai `Laravel ^13.8`, bukan Laravel 11
- autentikasi saat ini sudah berbasis login user + bearer token Sanctum
- frontend web menyimpan token di `localStorage` dengan key `weeb_auth_token`
- aplikasi bukan lagi mode single-user murni
- fitur `couple savings` benar-benar memanfaatkan 2 user berbeda
- ada role `admin` dan `user`

Artinya, implementasi mobile harus mengikuti kontrak auth multi-user saat ini, bukan asumsi lama tentang user default tunggal.

## 3. Tech Stack Saat Ini

### Frontend web

- React 19
- React Router 7
- Vite 8
- Tailwind CSS 4
- Axios
- React Hook Form
- Zod
- Zustand
- Recharts
- Workbox / PWA

### Backend API

- PHP 8.3
- Laravel 13
- Laravel Sanctum
- Laravel Socialite
- PostgreSQL atau SQLite
- service layer untuk logika finansial

## 4. Struktur Repo

```text
WeeB/
├── docs/
│   └── react-native-mobile-handover.md
├── weeb-ui/
│   ├── src/pages
│   ├── src/routes
│   ├── src/features
│   ├── src/hooks
│   ├── src/api
│   └── src/lib
└── weeb-api/
    ├── app/Http/Controllers/Api
    ├── app/Http/Resources
    ├── app/Services/Finance
    ├── app/Models
    ├── app/Http/Requests
    ├── database/migrations
    └── routes/api.php
```

## 5. Arsitektur Tingkat Tinggi

### Frontend web

Pola yang dipakai di `weeb-ui`:

- routing layar di `src/routes/AppRouter.jsx`
- banyak halaman CRUD dibangun dari konfigurasi generik di `src/features/shared/crudConfigs.jsx`
- akses API melalui `src/lib/axios.js`, `src/api/http.js`, dan `src/api/resources.js`
- data user aktif diambil melalui `useCurrentUser`
- data dashboard diambil melalui `useDashboard`
- layout utama dashboard ada di `src/layouts/DashboardLayout.jsx`

### Backend

Pola yang dipakai di `weeb-api`:

- route API didefinisikan di `routes/api.php`
- controller tipis menangani request/response
- validasi melalui `FormRequest`
- transform response melalui `Resource`
- logika finansial kompleks ada di `app/Services/Finance`

## 6. Konvensi API

Format response sukses:

```json
{
  "success": true,
  "message": "Profile loaded.",
  "data": {}
}
```

Format paginasi:

```json
{
  "success": true,
  "message": "Transactions loaded.",
  "data": [],
  "meta": {
    "current_page": 1,
    "last_page": 3,
    "per_page": 20,
    "total": 52
  }
}
```

Format error validasi:

```json
{
  "success": false,
  "message": "Validation failed.",
  "data": null,
  "errors": {
    "field_name": ["Pesan error"]
  }
}
```

### Catatan untuk mobile

- selalu baca payload utama dari `response.data.data`
- untuk list paginated, baca `response.data.meta`
- error UI sebaiknya memprioritaskan:
  1. `response.data.errors`
  2. `response.data.message`
  3. fallback generic

## 7. Autentikasi

### Mekanisme saat ini

- `POST /api/auth/login`
- `POST /api/auth/register`
- `GET /api/auth/google/redirect`
- `POST /api/auth/google/exchange`
- `GET /api/auth/me`
- `POST /api/auth/logout`

Backend mengembalikan token Sanctum personal access token dalam response login/register/google exchange.

Contoh shape login sukses:

```json
{
  "success": true,
  "message": "Login successful.",
  "data": {
    "token": "plain-text-token",
    "user": {
      "id": 1,
      "name": "User",
      "email": "user@mail.com",
      "role": "user",
      "status": "active",
      "profile": {}
    }
  }
}
```

### Perilaku frontend web saat ini

- token disimpan di `localStorage.weeb_auth_token`
- axios interceptor otomatis menambahkan header `Authorization: Bearer <token>`
- jika API mengembalikan `401`, token dihapus dan user diarahkan ke halaman login

### Rekomendasi React Native

- simpan token di `expo-secure-store` atau `react-native-mmkv`
- buat interceptor axios yang sama
- simpan juga snapshot `currentUser` agar splash/loading lebih cepat
- support logout lokal dan logout server

### Google login

Web saat ini mengandalkan redirect browser penuh. Di React Native sebaiknya:

- pakai OAuth native flow
- tetap gunakan endpoint backend yang kompatibel
- bila backend tetap mempertahankan pola `redirect -> code exchange`, implementasi mobile perlu membuka browser auth lalu menangkap callback

Saran praktis:

- evaluasi penambahan endpoint mobile-specific untuk OAuth agar lebih natural di RN

## 8. Guard dan Alur Navigasi

Di web, guard utama:

- `RequireAuth`: wajib punya token
- `RequireOnboarding`: jika `user.profile.onboarding_completed_at` kosong, paksa ke onboarding
- `RequireCoupleMode`: halaman tabungan berdua hanya untuk `account_mode !== personal`

### Implikasi untuk mobile

Flow navigasi mobile yang disarankan:

1. `Splash`
2. cek token lokal
3. bila tidak ada token -> `AuthStack`
4. bila ada token -> fetch `GET /auth/me`
5. bila onboarding belum selesai -> `OnboardingStack`
6. bila onboarding selesai -> `MainAppTabs`
7. sembunyikan menu `Couple Savings` jika `account_mode === personal`

## 9. Daftar Layar Web yang Perlu Dipetakan ke Mobile

Daftar route aktual dari `weeb-ui/src/routes/AppRouter.jsx`:

| Web route | Layar mobile | Status porting |
| --- | --- | --- |
| `/login` | LoginScreen | wajib |
| `/register` | RegisterScreen | wajib |
| `/auth/google/callback` | AuthCallbackScreen | opsional tergantung flow OAuth |
| `/onboarding` | OnboardingScreen | wajib |
| `/dashboard` | DashboardScreen | wajib |
| `/transactions` | TransactionsScreen | wajib |
| `/transactions/income` | TransactionsScreen dengan filter income | wajib |
| `/transactions/expense` | TransactionsScreen dengan filter expense | wajib |
| `/accounts` | AccountsScreen | wajib |
| `/categories` | CategoriesScreen | wajib |
| `/budgets` | BudgetsScreen | wajib |
| `/budget-planner` | BudgetPlannerScreen | wajib |
| `/periods` | FinancialPeriodsScreen | wajib |
| `/savings` | SavingsGoalsScreen | wajib |
| `/couple-savings` | CoupleSavingsScreen | wajib bila mode couple |
| `/emergency-fund` | EmergencyFundScreen | wajib |
| `/bills` | BillsScreen | wajib |
| `/recurring-transactions` | RecurringTransactionsScreen | wajib |
| `/reports` | ReportsScreen | wajib |
| `/insights` | InsightsScreen | wajib |
| `/wishlist` | WishlistScreen | wajib |
| `/profile` | ProfileScreen | wajib |
| `/users` | UserManagementScreen | admin only |

## 10. Modul Fitur dan Endpoint

### 10.1 Auth

Endpoint:

- `POST /auth/login`
- `POST /auth/register`
- `GET /auth/google/redirect`
- `POST /auth/google/exchange`
- `GET /auth/me`
- `POST /auth/logout`

Data penting:

- token
- user
- profile
- role

### 10.2 Onboarding

Endpoint:

- `GET /onboarding`
- `POST /onboarding`

Backend mendukung field:

- `name`
- `monthly_income_estimate`
- `payday_day`
- `daily_safe_amount_target`
- `account_mode`
- `saving_goal_name`
- `saving_goal_target`
- `emergency_fund_target`

Catatan penting:

- halaman web saat ini hanya meminta `account_mode`
- field onboarding lainnya diisi default hardcoded di frontend web
- untuk aplikasi mobile, onboarding sebaiknya didesain ulang agar user benar-benar mengisi data finansial awal

### 10.3 Dashboard

Endpoint:

- `GET /dashboard`
- `GET /dashboard/summary`
- `GET /dashboard/health-score`
- `GET /dashboard/insights`
- `GET /dashboard/cashflow-preview`
- `GET /payday-simulation`
- `GET /health-score`

Pola data yang dipakai UI web:

- `dashboard.status`
- `dashboard.period`
- `dashboard.summary`
- `dashboard.focused_balances`
- `dashboard.expense_by_need_type`
- `dashboard.budget_planner.allocations`
- `dashboard.is_empty`

Perilaku web:

- auto-refresh dashboard setiap 30 detik
- refetch saat tab browser kembali aktif

Untuk RN:

- refetch saat screen fokus
- optional background refresh
- hindari polling konstan jika belum dibutuhkan

### 10.4 Accounts

Endpoint:

- `GET /accounts`
- `POST /accounts`
- `PUT /accounts/{id}`
- `DELETE /accounts/{id}`
- `POST /account-allocations`

Field penting account:

- `id`
- `user_id`
- `name`
- `type`
- `purpose`
- `institution_name`
- `opening_balance`
- `current_balance`
- `is_default`
- `is_active`
- `notes`

Enumerasi `type` yang dipakai UI:

- `cash`
- `bank`
- `digital_bank`
- `e_wallet`
- `other`

Enumerasi `purpose` yang dipakai UI:

- `daily_spending`
- `salary`
- `savings`
- `couple_savings`
- `emergency_fund`
- `bills`
- `wishlist`
- `investment`
- `other`

### 10.5 Categories

Endpoint:

- `GET /categories`
- `POST /categories`
- `PUT /categories/{id}`
- `DELETE /categories/{id}`

Field penting:

- `account_id`
- `name`
- `icon`
- `transaction_type`
- `need_type`
- `is_default`
- `can_manage`

Enumerasi:

- `transaction_type`: `income`, `expense`, `both`
- `need_type`: `need`, `want`, `saving`, `debt`

Catatan mobile:

- karena ada `icon-picker` di web, tim mobile perlu menyiapkan mapping icon RN

### 10.6 Transactions

Endpoint:

- `GET /transactions`
- `POST /transactions`
- `PUT /transactions/{id}`
- `DELETE /transactions/{id}`
- `GET /incomes`
- `GET /expenses`

Field penting transaction resource:

- `id`
- `user_id`
- `account_id`
- `account`
- `category_id`
- `category`
- `transaction_type`
- `amount`
- `need_type`
- `transaction_date`
- `occurred_at`
- `description`
- `notes`
- `source`
- `entry_type`
- `links.bill_id`
- `links.saving_goal_id`
- `links.wishlist_id`
- `links.recurring_transaction_id`

Filter yang tampak dipakai:

- `transaction_type`
- `category_id`
- `need_type`
- `date_from`
- `date_to`
- `account_purpose`
- `per_page`

Catatan mobile:

- web menampilkan transaksi banyak dengan grouping per tanggal
- pada RN, paling cocok diimplementasikan dengan `SectionList` atau `FlashList`

### 10.7 Budgets

Endpoint:

- `GET /budgets`
- `POST /budgets`
- `PUT /budgets/{id}`
- `DELETE /budgets/{id}`

Field domain penting:

- `month`
- `planned_income`
- `planned_expense`
- `daily_safe_amount`
- `status`

### 10.8 Budget Planner

Endpoint:

- `GET /budget-planner`
- `PUT /budget-planner/allocations`

Kegunaan:

- menampilkan simulasi alokasi nominal per pos
- dipakai juga oleh dashboard

Catatan mobile:

- ini bukan CRUD biasa
- sebaiknya dibuat layar custom dengan slider/input angka dan preview distribusi

### 10.9 Financial Periods

Endpoint:

- `GET /periods`
- `POST /periods`
- `PUT /periods/{id}`
- `DELETE /periods/{id}`

Kegunaan:

- mendefinisikan periode keuangan aktif
- menjadi basis beberapa kalkulasi dashboard dan budget

### 10.10 Saving Goals

Endpoint:

- `GET /saving-goals`
- `POST /saving-goals`
- `PUT /saving-goals/{id}`
- `DELETE /saving-goals/{id}`

Field domain penting:

- `name`
- `type`
- `target_amount`
- `current_amount`
- `target_date`
- `priority`
- `status`

### 10.11 Emergency Fund

Endpoint:

- `GET /emergency-funds`
- `POST /emergency-fund`
- `PUT /emergency-fund/{id}`
- `DELETE /emergency-fund/{id}`

Catatan:

- secara domain, dana darurat sebenarnya adalah varian `saving_goal`

### 10.12 Bills

Endpoint:

- `GET /bills`
- `POST /bills`
- `PUT /bills/{id}`
- `DELETE /bills/{id}`
- `GET /recurring-bills`

Field domain penting:

- `name`
- `amount_estimate`
- `due_day`
- `next_due_date`
- `frequency`
- `reminder_days`
- `status`

### 10.13 Recurring Transactions

Endpoint:

- `GET /recurring-transactions`
- `POST /recurring-transactions`
- `PUT /recurring-transactions/{id}`
- `DELETE /recurring-transactions/{id}`

Field domain penting:

- `name`
- `transaction_type`
- `amount`
- `frequency`
- `day_of_month`
- `next_run_date`
- `status`

### 10.14 Wishlist

Endpoint:

- `GET /wishlists`
- `POST /wishlists`
- `PUT /wishlists/{id}`
- `DELETE /wishlists/{id}`

Field domain penting:

- `name`
- `estimated_amount`
- `need_type`
- `status`

### 10.15 Reports dan Insights

Endpoint:

- `GET /reports/monthly`
- `GET /reports/monthly/current`
- `GET /reports/category-breakdown`
- `GET /insights`
- `GET /dashboard/insights`
- `GET /statistics/expenses/categories`
- `GET /budget-alerts`

Monthly report resource:

- `month`
- `total_income`
- `total_expense`
- `total_saving`
- `remaining_amount`
- `financial_health_score`
- `summary`
- `generated_at`

### 10.16 Profile

Endpoint:

- `GET /profile`
- `PUT /profile`
- `PATCH /profile`

Shape penting `profile`:

- `currency`
- `timezone`
- `payday_day`
- `payday_frequency`
- `monthly_income_estimate`
- `daily_safe_amount_target`
- `account_mode`
- `transaction_reminder_enabled`
- `transaction_reminder_time`
- `transaction_reminder_last_sent_at`
- `onboarding_completed_at`

### 10.17 User Management

Endpoint:

- `GET /users`
- `POST /users`
- `PUT /users/{id}`
- `DELETE /users/{id}`

Dipakai untuk:

- admin menambah user
- admin mengatur status user
- admin mengelola partner tabungan berdua

### 10.18 Couple Savings

Endpoint:

- `GET /couple-savings/setting`
- `PUT /couple-savings/setting`
- `GET /accounts?purpose=couple_savings&is_active=true`
- `GET /transactions?transaction_type=income&account_purpose=couple_savings`

Aturan bisnis penting dari test backend:

- akun `couple_savings` bisa dilihat oleh kedua partner
- transaksi setoran ke akun `couple_savings` bisa dibuat oleh kedua partner
- transaksi private account tidak boleh dipakai partner lain
- hanya `admin` yang boleh mengubah pasangan pada `couple-savings/setting`

Shape setting:

- `partner_one_user_id`
- `partner_two_user_id`
- `partner_one`
- `partner_two`

Catatan UI mobile:

- layar ini adalah layar custom, bukan CRUD biasa
- perlu menampilkan:
  - total saldo tabungan berdua
  - daftar rekening tujuan `couple_savings`
  - histori setoran
  - total kontribusi tiap partner
  - pengaturan pasangan untuk admin

### 10.19 Push Notification

Endpoint:

- `GET /push/vapid-public-key`
- `POST /push/subscriptions`
- `DELETE /push/subscriptions`

Catatan:

- implementasi web saat ini memakai Web Push dan service worker
- ini tidak bisa dibawa 1:1 ke React Native
- untuk mobile, perlu desain ulang ke FCM atau Expo Notifications

## 11. Model Data Inti untuk Mobile

Contoh shape TypeScript yang direkomendasikan:

```ts
export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
  errors?: Record<string, string[]>;
  meta?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface UserProfile {
  currency: string | null;
  timezone: string | null;
  payday_day: number | null;
  payday_frequency: "weekly" | "biweekly" | "monthly" | null;
  monthly_income_estimate: string | number | null;
  daily_safe_amount_target: string | number | null;
  account_mode: "personal" | "couple";
  transaction_reminder_enabled: boolean;
  transaction_reminder_time: string | null;
  transaction_reminder_last_sent_at: string | null;
  onboarding_completed_at: string | null;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: "admin" | "user";
  status: "active" | "inactive";
  has_google: boolean;
  avatar_url: string | null;
  profile?: UserProfile;
}

export interface FinancialAccount {
  id: number;
  user_id: number;
  name: string;
  type: string;
  purpose: string;
  institution_name: string | null;
  opening_balance: string | number;
  current_balance: string | number;
  is_default: boolean;
  is_active: boolean;
  notes: string | null;
}

export interface Transaction {
  id: number;
  user_id: number;
  account_id: number | null;
  category_id: number | null;
  transaction_type: "income" | "expense";
  amount: string | number;
  need_type: "need" | "want" | "saving" | "debt" | null;
  transaction_date: string | null;
  occurred_at: string | null;
  description: string | null;
  notes: string | null;
  source: string | null;
  entry_type: "manual" | "account_allocation";
  account?: FinancialAccount;
}
```

## 12. Pemetaan Arsitektur Web ke React Native

### Yang bisa dipertahankan

- kontrak API backend
- struktur domain
- validasi berbasis Zod
- pemisahan service API
- pola resource list dan form

### Yang perlu diganti

- `BrowserRouter` -> `React Navigation`
- `localStorage` -> secure storage
- `window.location` redirect -> navigation actions
- `service worker` -> native notification handler
- `Recharts` -> chart library React Native
- polling berbasis visibility browser -> focus/app-state aware refresh

## 13. Arsitektur Mobile yang Disarankan

Saran stack React Native:

- Expo
- TypeScript
- React Navigation
- TanStack Query
- Axios
- React Hook Form
- Zod
- Zustand
- `expo-secure-store` atau `react-native-mmkv`
- `react-native-svg` + chart library mobile

Struktur folder yang disarankan:

```text
mobile/
├── src/
│   ├── api/
│   ├── auth/
│   ├── navigation/
│   ├── screens/
│   ├── features/
│   ├── components/
│   ├── store/
│   ├── hooks/
│   ├── types/
│   └── utils/
```

Pembagian state:

- server state: TanStack Query
- UI state lokal: Zustand
- auth session: Zustand + secure storage

## 14. Strategi Implementasi Mobile

### Fase 1

- auth
- onboarding
- dashboard
- accounts
- categories
- transactions

### Fase 2

- budgets
- budget planner
- financial periods
- saving goals
- emergency fund
- bills
- recurring transactions

### Fase 3

- reports
- insights
- wishlist
- profile
- user management
- couple savings
- push notifications native

## 15. Risiko dan Catatan Penting

### 1. Onboarding web saat ini belum ideal

Frontend web mengirim banyak default hardcoded. Jika disalin mentah ke mobile, pengalaman user akan buruk dan data awal bisa tidak akurat.

### 2. Dokumen lama repo sebagian tidak sinkron

File seperti `README.md` dan `weeb-api/docs/api-design.md` masih menyimpan beberapa asumsi lama. Saat ada konflik, prioritaskan:

1. `routes/api.php`
2. controller dan resource backend
3. test feature backend
4. implementasi frontend aktual

### 3. Couple savings perlu perlakuan khusus

Ini adalah fitur lintas user, bukan sekadar saving goal biasa.

### 4. Push notification tidak bisa dipindah 1:1

Web Push dan React Native memiliki model teknis berbeda.

### 5. CRUD generik web tidak harus disalin apa adanya

Di web, banyak layar dibangun dari konfigurasi shared. Di mobile, UX yang lebih natural biasanya lebih baik daripada meniru pola generic desktop.

## 16. Rekomendasi Keputusan Produk untuk Mobile

- jadikan dashboard, transaksi, rekening, dan tabungan sebagai prioritas utama
- sederhanakan navigasi menjadi bottom tabs + nested stacks
- redesign onboarding agar benar-benar mengumpulkan data finansial awal
- pertahankan endpoint backend yang ada sejauh mungkin
- tambahkan endpoint baru hanya jika flow mobile memang sulit dipetakan
- treat `couple savings` sebagai fitur premium/custom flow, bukan layar CRUD standar

## 17. Checklist Handoff Sebelum Tim Mobile Mulai

- review semua endpoint di `weeb-api/routes/api.php`
- sepakati flow login Google untuk mobile
- sepakati desain onboarding baru
- sepakati library chart di RN
- sepakati strategi push notification native
- sepakati prioritas fitur fase 1
- tentukan apakah mobile akan dibuat dengan Expo managed atau bare workflow

## 18. File Referensi Utama di Repo

Frontend:

- `weeb-ui/src/routes/AppRouter.jsx`
- `weeb-ui/src/lib/axios.js`
- `weeb-ui/src/features/shared/crudConfigs.jsx`
- `weeb-ui/src/hooks/useCurrentUser.js`
- `weeb-ui/src/hooks/useDashboard.js`
- `weeb-ui/src/pages/CoupleSavingsPage.jsx`

Backend:

- `weeb-api/routes/api.php`
- `weeb-api/app/Http/Controllers/Api/Auth/PasswordAuthController.php`
- `weeb-api/app/Http/Controllers/Api/Auth/GoogleAuthController.php`
- `weeb-api/app/Http/Controllers/Api/ProfileController.php`
- `weeb-api/app/Http/Controllers/Api/OnboardingController.php`
- `weeb-api/app/Http/Resources/UserResource.php`
- `weeb-api/app/Http/Resources/UserProfileResource.php`
- `weeb-api/app/Http/Resources/FinancialAccountResource.php`
- `weeb-api/app/Http/Resources/TransactionResource.php`
- `weeb-api/app/Http/Resources/CoupleSavingsSettingResource.php`
- `weeb-api/tests/Feature/ApiAuthenticationRequiredTest.php`
- `weeb-api/tests/Feature/CoupleSavingsAccountSharingTest.php`
- `weeb-api/tests/Feature/CoupleSavingsSettingTest.php`

## 19. Kesimpulan

Versi mobile WeeB sangat memungkinkan dibangun ulang dengan backend yang sama. Kontrak API, domain model, dan rule bisnis inti sudah cukup matang untuk dipakai kembali. Area yang paling perlu keputusan desain ulang adalah:

- auth Google di mobile
- onboarding
- push notification native
- UX untuk dashboard dan layar CRUD agar lebih natural di perangkat mobile

Jika tim mobile mengikuti dokumen ini, implementasi bisa dimulai tanpa harus menebak-nebak struktur web yang ada sekarang.
