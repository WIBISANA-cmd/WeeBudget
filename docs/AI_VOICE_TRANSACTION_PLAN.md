# Implementation Plan — Pencatatan Transaksi via Suara Natural (AI Agent)

> Status: **PLAN ONLY — belum dieksekusi.** Hasil analisis seluruh project WeeB + rancangan implementasi terperinci.

---

## 1. Tujuan / Scope

Pengguna memasukkan pemasukan/pengeluaran dengan bahasa natural (suara atau teks), agent:
1. **Parsing** teks → satu atau **banyak** transaksi dalam satu kalimat.
   Contoh: *"Hari ini beli kopi 50 ribu dan isi bensin 100 ribu"* → 2 transaksi.
2. **Mengkategorikan** otomatis (kopi → Makan/Jajan, bensin → Transport).
3. **Menyimpan** ke database.
4. **Memberi peringatan** jika pengeluaran melebihi/mendekati budget bulanan.

**Prinsip aman (jalur uang):** agent menampilkan draft hasil parsing untuk **dikonfirmasi satu ketuk**, lalu menyimpan. Parsing multi-item + nominal rawan salah, jadi konfirmasi = default. (Mode "simpan langsung tanpa review" bisa jadi opsi, lihat §9.)

---

## 2. Kondisi Project Saat Ini (hasil analisis)

### Backend — `weeb-api` (Laravel 13, PHP 8.3, Sanctum, service-layer)
- **Simpan transaksi**: `POST /api/transactions` → [AllTransactionController::store](../weeb-api/app/Http/Controllers/Api/AllTransactionController.php#L57) → [AccountBalanceService::createTransaction](../weeb-api/app/Services/Finance/AccountBalanceService.php#L17). Validasi di [StoreTransactionRequest](../weeb-api/app/Http/Requests/Finance/StoreTransactionRequest.php).
- **Field transaksi** ([Transaction](../weeb-api/app/Models/Transaction.php)): `account_id`(wajib), `category_id`(nullable), `amount`(>0), `need_type`(`need|want|saving|debt`), `transaction_date`(wajib), `description`, `transaction_type`(`income|expense`).
- **Kategori**: 19 default global (`user_id=null`) di [TransactionCategorySeeder](../weeb-api/database/seeders/TransactionCategorySeeder.php) — Gaji, Makan, Transport, Jajan, Cicilan, dst; tiap kategori punya `transaction_type` & `need_type`. Plus kategori custom per-user. Diakses via `GET /api/categories`.
- **Rekening**: [FinancialAccount](../weeb-api/app/Models/FinancialAccount.php), `GET /api/accounts`.
- **PERINGATAN BUDGET SUDAH ADA**: [BudgetAlertService::overspending(User, $month)](../weeb-api/app/Services/Finance/BudgetAlertService.php) mengembalikan per-kategori `{allocated_amount, spent_amount, remaining_amount, usage_percent, status}` dengan `status` = `exceeded`(≥100%)/`warning`(≥80%)/`safe`. Endpoint: `GET /api/budget-alerts?month=YYYY-MM-DD` ([BudgetAlertController](../weeb-api/app/Http/Controllers/Api/BudgetAlertController.php)). Budget bulanan: [Budget](../weeb-api/app/Models/Budget.php) + [BudgetCategory](../weeb-api/app/Models/BudgetCategory.php) (`allocated_amount`).
- Semua route di grup middleware `UseDefaultUser` di [routes/api.php](../weeb-api/routes/api.php).
- **`GEMINI_API_KEY` sudah dipasang di `.env`** (baris `GEMINI_API_KEY=AIza…`). Belum ada config/service yang membacanya. Dependency: Laravel, Sanctum, Socialite, web-push.

### Frontend — `weeb-ui` (React 19, Vite, Zustand, axios, Tailwind, PWA)
- Form transaksi: [TransactionsPage.jsx](../weeb-ui/src/pages/TransactionsPage.jsx) → `CrudResourcePage` + `ResourceForm`.
- API: [src/api/http.js](../weeb-ui/src/api/http.js) + [src/lib/axios.js](../weeb-ui/src/lib/axios.js) (bearer token).
- Opsi: [useCategoryOptions](../weeb-ui/src/hooks/useCategoryOptions.js), `useAccountOptions`. Nav mobile: [MobileBottomNav.jsx](../weeb-ui/src/layouts/components/MobileBottomNav.jsx).

---

## 3. Arsitektur (lazy + reuse maksimal)

### 3.1 Speech-to-Text (opsional; input teks tetap didukung)
**Fase 1: Web Speech API (`webkitSpeechRecognition`, `lang='id-ID'`)** — native, gratis, tanpa dependency, tanpa upload audio. Chrome/Android penuh; **iOS Safari/PWA tidak konsisten**.
Input teks manual (ketik) juga didukung dari endpoint yang sama, jadi fitur tetap jalan tanpa STT.
`// ponytail: Web Speech API dulu; Whisper server-side (Fase 2) hanya kalau iOS jadi blocker.`

### 3.2 Parsing teks → daftar transaksi (inti "AI agent") — pakai **Gemini**
Kirim transkrip + daftar kategori & rekening user + tanggal hari ini ke **Gemini API** (`generativelanguage.googleapis.com`), pakai **JSON mode** (`generationConfig.responseMimeType = "application/json"` + `responseSchema`) supaya output dijamin JSON terstruktur berupa **array transaksi**:
```jsonc
{
  "transactions": [
    { "transaction_type": "income|expense",
      "amount": 50000,               // Rupiah penuh; "50 ribu"→50000, "1,5 juta"→1500000
      "category_id": 12,             // dipilih dari list user; null jika ragu
      "account_id": 3,               // null → pakai rekening is_default
      "need_type": "need|want|saving|debt|null",
      "transaction_date": "2026-07-25", // default = hari ini utk "hari ini/tadi/kemarin"
      "description": "Beli kopi",
      "confidence": "high|medium|low" }
  ]
}
```
- Model default `gemini-2.0-flash` (murah & cepat, sangat cukup untuk ekstraksi ini); bisa dinaikkan ke `gemini-2.5-flash`/`gemini-2.5-pro` bila perlu akurasi lebih. Diset via env `GEMINI_MODEL` (§9).
- LLM = parser murni → JSON. Bukan agent tool-use auto-simpan → paling sederhana & aman. `category_id`/`account_id` hanya boleh dari list yang dikirim; ragu → `null` (user lengkapi).
- **Tanpa dependency baru**: panggil REST Gemini via `Http` facade Laravel (bawaan). Endpoint: `POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent` dengan header `x-goog-api-key: {GEMINI_API_KEY}`. `// ponytail: Http facade bawaan; tak perlu SDK Gemini.`

### 3.3 Alur end-to-end
```
[Mic/ketik] → (Web Speech API) → transkrip
  → POST /api/transactions/voice-parse { transcript }
  → VoiceTransactionParser (Claude) → array draft
  → UI tampilkan daftar draft (edit/hapus/konfirmasi per item)
  → simpan tiap item via POST /api/transactions  (JALUR YANG SUDAH ADA)
  → GET /api/budget-alerts?month=...  (JALUR YANG SUDAH ADA) → tampilkan peringatan
```
**Backend baru yang sesungguhnya hanya endpoint `voice-parse`.** Simpan, validasi, update saldo, dan peringatan budget — semua reuse. `AccountBalanceService`/`StoreTransactionRequest`/`BudgetAlertService` tidak diubah.

> Alternatif (jika butuh atomic multi-save + alert satu round-trip): endpoint `voice-commit` yang transaksional menyimpan semua + memanggil `BudgetAlertService` inline. Lebih rapi tapi nambah kode. Default plan: loop `POST /transactions` di frontend (paling lazy). Lihat §4.5.

---

## 4. Perubahan Backend (`weeb-api`)

### 4.1 Config (tanpa dependency baru)
- `GEMINI_API_KEY` **sudah ada** di `.env`. Tambah `GEMINI_MODEL` di `.env` + `.env.example`:
  ```
  GEMINI_MODEL=gemini-2.0-flash
  ```
- `config/services.php`:
  ```php
  'gemini' => [
      'api_key' => env('GEMINI_API_KEY'),
      'model'   => env('GEMINI_MODEL', 'gemini-2.0-flash'),
  ],
  ```
  (Gunakan `config('services.gemini.*')`, bukan `env()` langsung, agar aman saat `config:cache`.)

### 4.2 Service — `app/Services/AI/VoiceTransactionParser.php`
Ikuti pola service-layer. Tanggung jawab:
1. Ambil kategori (`user_id=$userId` OR `NULL`) + rekening aktif user → ringkas `{id,name,transaction_type,need_type}` / `{id,name}`.
2. Susun prompt (`contents`): instruksi (aturan output + Rupiah penuh + tanggal relatif + pilih id dari list saja) + list kategori/rekening + `today` + transcript.
3. Panggil Gemini via `Http` facade dengan `responseSchema` **array** (§3.2):
   ```php
   $res = Http::withHeaders(['x-goog-api-key' => config('services.gemini.api_key')])
       ->timeout(20)
       ->post("https://generativelanguage.googleapis.com/v1beta/models/"
           .config('services.gemini.model').":generateContent", [
           'contents' => [['parts' => [['text' => $prompt]]]],
           'generationConfig' => [
               'responseMimeType' => 'application/json',
               'responseSchema'   => $schema,   // {type:ARRAY, items:{...field transaksi...}}
               'temperature'      => 0,
           ],
       ]);
   ```
   Ambil teks JSON di `candidates.0.content.parts.0.text`, `json_decode` → `array<draft>` (belum tersimpan).
4. Tangani error (`$res->failed()`, `finishReason` SAFETY/MAX_TOKENS, JSON tak valid) → exception yang di-catch controller.
`// ponytail: model tak menyimpan apa pun & tak melewati guard apa pun — hanya memetakan teks ke field. Validasi tetap di StoreTransactionRequest saat create.`

> Catatan schema Gemini: `responseSchema` pakai enum tipe kapital (`ARRAY`,`OBJECT`,`STRING`,`NUMBER`,`INTEGER`) dan **tidak** mendukung `null` sebagai tipe. Untuk field yang boleh kosong (`category_id`,`account_id`,`need_type`), jadikan opsional (tak masuk `required`) atau minta model mengisi `0`/`""` lalu backend memetakan → `null`.

### 4.3 Controller — `app/Http/Controllers/Api/VoiceTransactionController.php`
- `parse(Request $req, VoiceTransactionParser $parser)`:
  - Validasi `transcript` => `['required','string','max:500']`.
  - Return `array<draft>` + `raw_transcript` via trait `RespondsWithApi` (`$this->success(...)`). **Tidak** membuat transaksi.

### 4.4 Route — `routes/api.php` (grup `UseDefaultUser`, sebelum `apiResource('transactions')`)
```php
Route::post('/transactions/voice-parse', [VoiceTransactionController::class, 'parse'])
    ->middleware('throttle:20,1')
    ->name('transactions.voice-parse');
```

### 4.5 Simpan + Peringatan Budget — REUSE (tanpa kode baru)
- **Simpan**: frontend loop `POST /api/transactions` untuk tiap draft yang dikonfirmasi (memakai `AllTransactionController` + semua validasi/otorisasi/update-saldo yang ada).
- **Peringatan**: setelah simpan, frontend `GET /api/budget-alerts?month=<bulan transaksi>` → `BudgetAlertService::overspending` mengembalikan kategori ber-`status` `warning`/`exceeded`. Tampilkan (mis. *"⚠️ Transport sudah 105% dari budget (Rp 1.050.000 / Rp 1.000.000)"*).
- Peringatan otomatis akurat karena dihitung dari total transaksi bulan berjalan (termasuk yang baru disimpan).

### 4.6 Test (self-check)
- `tests/Feature/VoiceTransactionParseTest.php`: pakai `Http::fake()` untuk respons Gemini, POST transkrip **multi-item** ("kopi 50rb dan bensin 100rb"), assert draft = 2 item, amount numeric, category_id ∈ list user, transaction_type valid. Satu test yang gagal bila mapping/multi-parse rusak — tanpa panggil API asli.

---

## 5. Perubahan Frontend (`weeb-ui`)

### 5.1 Hook STT — `src/hooks/useSpeechRecognition.js`
Wrapper tipis Web Speech API: `{ supported, listening, transcript, error, start(), stop() }`, `lang='id-ID'`. `// ponytail: native API, tanpa library.`

### 5.2 API — `src/api/resources.js`
```js
export const voiceApi = { parse: (transcript) => apiPost('/transactions/voice-parse', { transcript }) };
```

### 5.3 Komponen "Catat via Suara" + review
- Tombol/FAB mic di [MobileBottomNav.jsx](../weeb-ui/src/layouts/components/MobileBottomNav.jsx) (+ opsional di header TransactionsPage). Sertakan input teks fallback (ketik) untuk perangkat tanpa STT.
- Flow state: `idle → listening → parsing → review → saving → done`.
  1. Mic/ketik → transkrip.
  2. `voiceApi.parse(transcript)` → **daftar draft** (bisa >1).
  3. **Panel review**: tiap draft = kartu dengan tipe, nominal, kategori (dropdown, prefilled), rekening, tanggal, deskripsi. User bisa **edit / hapus / tambah** item. Sorot field `null` atau `confidence:low`.
  4. Konfirmasi → loop `resourcesApi.create('/transactions', payload)` per item (map field draft → payload; pakai `configs.transactions.toPayload` yang ada bila cocok).
  5. Setelah semua tersimpan → `apiGet('/budget-alerts', { month })` → jika ada alert, tampilkan banner peringatan.
- Reuse `ResourceForm`/`Modal` yang ada untuk editing per kartu bila memungkinkan.

### 5.4 UX
- Tampilkan transkrip mentah ("Kamu bilang: …") agar user paham asal draft.
- Tangani izin mic ditolak & `!supported` → sembunyikan mic / arahkan ke input teks.
- Ringkasan pasca-simpan: "2 transaksi tersimpan • total Rp 150.000" + peringatan budget bila ada.

---

## 6. Peringatan Budget — Detail
- **Reuse penuh** `BudgetAlertService::overspending` + `GET /budget-alerts`. Tidak ada perhitungan baru.
- Prasyarat: user punya `Budget` bulan berjalan dengan `BudgetCategory.allocated_amount`. Jika belum ada budget → `has_budget:false`, peringatan di-skip (bukan error).
- Ambang bawaan: `warning ≥80%`, `exceeded ≥100%`.
- (Opsional polish) frasa peringatan bisa dirangkai LLM agar lebih natural — ditunda; tampilan terstruktur sudah cukup. `// ponytail: tampilkan alert terstruktur; LLM-phrasing hanya kalau diminta.`

---

## 7. Keamanan & Biaya
- **API key hanya di backend.** Rate limit (`throttle:20,1`) + `max:500` transcript.
- Simpan lewat `POST /transactions` → semua validasi & otorisasi rekening (couple savings dll) tetap berlaku; draft AI tak melewati guard apa pun.
- Privasi: transkrip = data finansial; hati-hati saat logging, jangan log API key.
- Model = tuas biaya utama: `gemini-2.0-flash`/`2.5-flash` murah & cepat; `2.5-pro` lebih akurat tapi lebih mahal.
- Gemini punya **free tier** (rate limit rendah) — cocok untuk dev; pantau kuota untuk produksi.

---

## 8. Urutan Eksekusi (saat disetujui)
1. Backend config (`GEMINI_MODEL` di `.env`, blok `gemini` di `services.php`) — tanpa composer require.
2. `VoiceTransactionParser` (Gemini via `Http`, `responseSchema` array) + `VoiceTransactionController` + route + throttle.
3. Feature test multi-item (mock).
4. Frontend hook STT + input teks fallback.
5. Frontend panel review multi-draft + loop save + tampil peringatan budget.
6. Uji end-to-end (Chrome/Android): 1 item, multi-item, tanggal relatif, kategori ambigu, kasus lewat budget.
7. (Opsional) Fase 2 Whisper (iOS); (opsional) endpoint `voice-commit` atomic; (opsional) LLM-phrased warning.

---

## 9. Keputusan yang Perlu Konfirmasi User
1. **Model Gemini**: `gemini-2.0-flash` (default, murah/cepat) vs `gemini-2.5-flash` vs `gemini-2.5-pro` (paling akurat, lebih mahal). Diset via `GEMINI_MODEL`.
2. **Konfirmasi vs simpan-langsung**: default plan = review satu-ketuk sebelum simpan (aman untuk multi-item). Mau tambahkan mode "simpan langsung tanpa review"?
3. **Target iOS sejak awal?** Jika ya → sertakan Fase 2 (Whisper) sejak awal (Web Speech API tidak jalan di Safari/PWA iOS).
4. **Simpan: loop frontend (lazy, default) vs endpoint `voice-commit` atomic** (satu round-trip, transaksional, +sedikit kode backend).
