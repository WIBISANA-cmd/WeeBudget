<?php

namespace App\Services\AI;

use App\Models\FinancialAccount;
use App\Models\TransactionCategory;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class VoiceTransactionParser
{
    public function parse(User $user, string $transcript): array
    {
        $forkedSourceIds = TransactionCategory::query()
            ->where('user_id', $user->id)
            ->whereNotNull('source_category_id')
            ->pluck('source_category_id')
            ->all();

        $categories = TransactionCategory::query()
            ->where(function ($query) use ($user, $forkedSourceIds) {
                $query->where('user_id', $user->id)
                    ->orWhere(fn ($q) => $q->whereNull('user_id')->whereNotIn('id', $forkedSourceIds));
            })
            ->get(['id', 'name', 'transaction_type', 'need_type', 'account_id'])
            ->map(fn ($cat) => [
                'id' => $cat->id,
                'name' => $cat->name,
                'transaction_type' => $cat->transaction_type,
                'need_type' => $cat->need_type,
                'account_id' => $cat->account_id,
            ])
            ->values()
            ->toArray();

        $accounts = FinancialAccount::query()
            ->where('user_id', $user->id)
            ->where('is_active', true)
            ->get(['id', 'name', 'is_default'])
            ->map(fn ($acc) => [
                'id' => $acc->id,
                'name' => $acc->name,
                'is_default' => $acc->is_default,
            ])
            ->values()
            ->toArray();

        $defaultAccount = collect($accounts)->firstWhere('is_default', true) ?? collect($accounts)->first();
        $defaultAccountId = $defaultAccount['id'] ?? null;
        $todayStr = Carbon::today()->format('Y-m-d');

        $prompt = $this->buildPrompt($transcript, $categories, $accounts, $todayStr, $defaultAccountId);

        $apiKey = config('services.ai.api_key');
        $baseUrl = config('services.ai.base_url', 'https://ai.sumopod.com/v1');
        $model = config('services.ai.model', 'MiniMax-M2.7-highspeed');

        if (empty($apiKey)) {
            throw new RuntimeException('API_KEY_AI is not configured.');
        }

        $url = rtrim($baseUrl, '/') . '/chat/completions';

        $response = Http::withHeaders([
            'Authorization' => "Bearer {$apiKey}",
        ])
        ->timeout(30)
        ->post($url, [
            'model' => $model,
            'messages' => [
                [
                    'role' => 'user',
                    'content' => $prompt,
                ],
            ],
            'temperature' => 0.1,
            'response_format' => ['type' => 'json_object'],
        ]);

        if (! $response || $response->failed()) {
            $lastStatus = $response ? $response->status() : 500;
            Log::warning("AI API call failed for model {$model}", [
                'status' => $lastStatus,
                'body' => $response ? $response->body() : null,
            ]);

            if ($lastStatus === 429) {
                throw new RuntimeException('Batas pemanggilan kuota API harian/menit telah tercapai (429 Quota Exceeded). Silakan tunggu beberapa saat atau perbarui API Key.');
            }

            throw new RuntimeException('Gagal menghubungi layanan AI. (Status ' . $lastStatus . ')');
        }

        $responseData = $response->json();
        $text = $responseData['choices'][0]['message']['content'] ?? null;

        if (! $text) {
            throw new RuntimeException('Tidak ada respons yang valid dari layanan AI.');
        }

        // Hilangkan format markdown code block jika ada (seperti ```json ... ```)
        $cleanText = $text;
        if (preg_match('/^\s*```(?:json)?\s*(.*?)\s*```/s', $cleanText, $matches)) {
            $cleanText = $matches[1];
        }
        $cleanText = trim($cleanText);

        $decoded = json_decode($cleanText, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            Log::error("Failed to decode JSON from AI response", [
                'raw_text' => $text,
                'clean_text' => $cleanText,
                'json_error' => json_last_error_msg()
            ]);
            throw new RuntimeException('Gagal memproses format data dari AI.');
        }

        $rawDrafts = $decoded['transactions'] ?? [];

        $validCategoryIds = collect($categories)->pluck('id')->all();
        $validAccountIds = collect($accounts)->pluck('id')->all();

        $processedDrafts = array_map(function ($item) use ($todayStr, $defaultAccountId, $validCategoryIds, $validAccountIds, $categories) {
            $catId = isset($item['category_id']) && in_array((int) $item['category_id'], $validCategoryIds, true)
                ? (int) $item['category_id']
                : null;

            $matchedCategory = $catId ? collect($categories)->firstWhere('id', $catId) : null;

            $accId = isset($item['account_id']) && in_array((int) $item['account_id'], $validAccountIds, true)
                ? (int) $item['account_id']
                : $defaultAccountId;

            // Rekening yang sudah diset pada kategori (Sumber Rekening/Rekening Tujuan) selalu jadi acuan utama.
            if ($matchedCategory && in_array((int) ($matchedCategory['account_id'] ?? 0), $validAccountIds, true)) {
                $accId = (int) $matchedCategory['account_id'];
            }

            $needType = $item['need_type'] ?? ($matchedCategory['need_type'] ?? null);
            if (! in_array($needType, ['need', 'want', 'saving', 'debt'], true)) {
                $needType = $item['transaction_type'] === 'expense' ? 'need' : null;
            }

            return [
                'transaction_type' => in_array($item['transaction_type'] ?? '', ['income', 'expense'], true) ? $item['transaction_type'] : 'expense',
                'amount' => max(0, (float) ($item['amount'] ?? 0)),
                'category_id' => $catId,
                'account_id' => $accId,
                'need_type' => $needType,
                'transaction_date' => ! empty($item['transaction_date']) ? $item['transaction_date'] : $todayStr,
                'description' => $item['description'] ?? 'Transaksi Tanpa Keterangan',
                'confidence' => in_array($item['confidence'] ?? '', ['high', 'medium', 'low'], true) ? $item['confidence'] : 'medium',
            ];
        }, $rawDrafts);

        return [
            'raw_transcript' => $transcript,
            'drafts' => $processedDrafts,
        ];
    }

    private function buildPrompt(string $transcript, array $categories, array $accounts, string $todayStr, ?int $defaultAccountId): string
    {
        $categoryJson = json_encode($categories, JSON_UNESCAPED_UNICODE);
        $accountJson = json_encode($accounts, JSON_UNESCAPED_UNICODE);

        return <<<PROMPT
Anda adalah asisten keuangan pintar WeeBudget (WeeB). Tugas Anda adalah mengekstrak transaksi keuangan dari kalimat suara/teks natural pengguna dalam bahasa Indonesia.

Tanggal Hari Ini: {$todayStr}
Rekening Default User (id): {$defaultAccountId}

Daftar Kategori Tersedia (pilih id yang paling relevan, jika ragu/tidak cocok beri nilai 0):
{$categoryJson}

Daftar Rekening Tersedia (pilih id jika disebutkan, jika tidak disebutkan beri id rekening default atau 0):
{$accountJson}

Petunjuk Parsing:
1. Satu kalimat bisa berisi 1 atau LEBIH DARI 1 transaksi (misal: "Hari ini beli kopi 25rb pakai BCA dan dapat transfer 500rb ke Mandiri" -> 2 transaksi).
2. Konversi istilah nominal bahasa Indonesia ke angka penuh (contoh: "50 ribu" / "50rb" -> 50000, "1,5 juta" -> 1500000, "dua ratus ribu" -> 200000).
3. Tentukan transaction_type: "income" jika pemasukan (gaji, transfer masuk, jualan, dapat hadiah) atau "expense" jika pengeluaran (beli, bayar, isi, jajan, kirim).
4. Penentuan Rekening (account_id):
   - Jika "expense" (pengeluaran): Cari rekening SUMBER yang dipotong/digunakan untuk membayar (contoh: "pakai BCA", "bayar dari Mandiri", "potong tunai", "pakai GoPay").
   - Jika "income" (pemasukan): Cari rekening TUJUAN yang menerima uang/ditambahkan saldo (contoh: "masuk ke BCA", "dapat transfer ke Mandiri", "cair ke Jago", "dapat cash 100rb").
   - Cocokkan frasa/nama rekening dari ucapan pengguna dengan 'Daftar Rekening Tersedia'. Jika tidak ada yang disebutkan secara spesifik, gunakan ID rekening default ({$defaultAccountId}) atau 0.
5. Tentukan need_type dari kategori atau konteks: "need" (kebutuhan dasar), "want" (keinginan/hiburan), "saving" (tabungan/investasi), "debt" (cicilan/hutang). Untuk income, boleh diset "".
6. Tanggal transaksi: Jika menyebut "kemarin", "lusa", atau tanggal spesifik, sesuaikan format YYYY-MM-DD berdasarkan Tanggal Hari Ini ({$todayStr}). Jika tidak sebutkan tanggal, gunakan {$todayStr}.
7. Isikan confidence dengan "high", "medium", atau "low".

Format respons Anda HARUS berupa JSON valid dengan skema berikut:
{
  "transactions": [
    {
      "transaction_type": "income" | "expense",
      "amount": number,
      "category_id": integer,
      "account_id": integer,
      "need_type": "need" | "want" | "saving" | "debt" | null,
      "transaction_date": "YYYY-MM-DD",
      "description": string,
      "confidence": "high" | "medium" | "low"
    }
  ]
}

Contoh 1:
User: "kemarin beli nasi goreng 25rb pakai BCA"
(Misal: Makan & Minum ID=2, BCA ID=5, Hari ini=2026-07-27)
Respons JSON:
{
  "transactions": [
    {
      "transaction_type": "expense",
      "amount": 25000,
      "category_id": 2,
      "account_id": 5,
      "need_type": "need",
      "transaction_date": "2026-07-26",
      "description": "beli nasi goreng",
      "confidence": "high"
    }
  ]
}

Contoh 2:
User: "gajian masuk 5 juta rupiah ke rekening mandiri"
(Misal: Gaji/Pemasukan ID=8, Mandiri ID=3, Hari ini=2026-07-27)
Respons JSON:
{
  "transactions": [
    {
      "transaction_type": "income",
      "amount": 5000000,
      "category_id": 8,
      "account_id": 3,
      "need_type": "",
      "transaction_date": "2026-07-27",
      "description": "gajian masuk",
      "confidence": "high"
    }
  ]
}

Teks Suara/Teks Pengguna:
"{$transcript}"
PROMPT;
    }
}
