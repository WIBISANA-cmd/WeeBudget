<?php

namespace Tests\Feature;

use App\Models\FinancialAccount;
use App\Models\TransactionCategory;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class VoiceTransactionParseTest extends TestCase
{
    use RefreshDatabase;

    public function test_voice_parse_requires_transcript(): void
    {
        $user = User::factory()->create();

        $this->withToken($user->createToken('test')->plainTextToken)
            ->postJson('/api/transactions/voice-parse', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['transcript']);
    }

    public function test_voice_parse_returns_draft_transactions_using_ai_fake(): void
    {
        $user = User::factory()->create();
        $account = FinancialAccount::create([
            'user_id' => $user->id,
            'name' => 'BCA Utama',
            'type' => 'bank',
            'opening_balance' => 500000,
            'current_balance' => 500000,
            'is_default' => true,
            'is_active' => true,
        ]);
        $category = TransactionCategory::create([
            'user_id' => $user->id,
            'name' => 'Makan & Minum',
            'slug' => 'makan-minum',
            'transaction_type' => 'expense',
            'need_type' => 'need',
            'is_default' => true,
        ]);

        $mockResponse = [
            'choices' => [
                [
                    'message' => [
                        'content' => json_encode([
                            'transactions' => [
                                [
                                    'transaction_type' => 'expense',
                                    'amount' => 35000,
                                    'category_id' => $category->id,
                                    'account_id' => $account->id,
                                    'need_type' => 'need',
                                    'transaction_date' => '2026-07-25',
                                    'description' => 'Beli nasi goreng',
                                    'confidence' => 'high',
                                ],
                                [
                                    'transaction_type' => 'expense',
                                    'amount' => 50000,
                                    'category_id' => 0,
                                    'account_id' => 0,
                                    'need_type' => 'need',
                                    'transaction_date' => '2026-07-25',
                                    'description' => 'Isi bensin motor',
                                    'confidence' => 'medium',
                                ],
                            ],
                        ]),
                    ],
                ],
            ],
        ];

        Http::fake([
            'https://ai.sumopod.com/v1/*' => Http::response($mockResponse, 200),
        ]);

        $response = $this->withToken($user->createToken('test')->plainTextToken)
            ->postJson('/api/transactions/voice-parse', [
                'transcript' => 'Beli nasi goreng 35 ribu dan isi bensin 50 ribu',
            ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.raw_transcript', 'Beli nasi goreng 35 ribu dan isi bensin 50 ribu')
            ->assertJsonCount(2, 'data.drafts')
            ->assertJsonPath('data.drafts.0.amount', 35000)
            ->assertJsonPath('data.drafts.0.category_id', $category->id)
            ->assertJsonPath('data.drafts.0.description', 'Beli nasi goreng')
            ->assertJsonPath('data.drafts.1.amount', 50000)
            ->assertJsonPath('data.drafts.1.category_id', null)
            ->assertJsonPath('data.drafts.1.account_id', $account->id);
    }
}
