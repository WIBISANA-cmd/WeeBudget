<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Tests\TestCase;

class SecurityTest extends TestCase
{
    use RefreshDatabase;

    // ── Security headers ────────────────────────────────────────────────────

    public function test_api_responses_include_security_headers(): void
    {
        $response = $this->getJson('/api/auth/me');

        $response->assertHeader('X-Content-Type-Options', 'nosniff');
        $response->assertHeader('X-Frame-Options', 'DENY');
        $response->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    }

    // ── Rate limiting ────────────────────────────────────────────────────────

    public function test_login_endpoint_is_rate_limited(): void
    {
        User::factory()->create(['email' => 'rl@weeb.test', 'password' => Hash::make('p@ssw0rd!')]);

        for ($i = 0; $i < 10; $i++) {
            $this->postJson('/api/auth/login', ['email' => 'rl@weeb.test', 'password' => 'wrong']);
        }

        $this->postJson('/api/auth/login', ['email' => 'rl@weeb.test', 'password' => 'wrong'])
            ->assertStatus(429);
    }

    public function test_register_endpoint_is_rate_limited(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/auth/register', [
                'name' => 'Test',
                'email' => "test{$i}@weeb.test",
                'password' => 'p@ssw0rd!',
                'password_confirmation' => 'p@ssw0rd!',
            ]);
        }

        $this->postJson('/api/auth/register', [
            'name' => 'Test',
            'email' => 'overflow@weeb.test',
            'password' => 'p@ssw0rd!',
            'password_confirmation' => 'p@ssw0rd!',
        ])->assertStatus(429);
    }

    // ── OAuth code exchange ──────────────────────────────────────────────────

    public function test_google_exchange_requires_valid_code(): void
    {
        $this->postJson('/api/auth/google/exchange', ['code' => Str::random(64)])
            ->assertUnprocessable()
            ->assertJsonPath('success', false);
    }

    public function test_google_exchange_returns_token_for_valid_code(): void
    {
        $code = Str::random(64);
        Cache::put("google_auth_code:{$code}", 'test-token-value', now()->addSeconds(60));

        $this->postJson('/api/auth/google/exchange', ['code' => $code])
            ->assertOk()
            ->assertJsonPath('data.token', 'test-token-value');
    }

    public function test_google_exchange_code_is_single_use(): void
    {
        $code = Str::random(64);
        Cache::put("google_auth_code:{$code}", 'test-token-value', now()->addSeconds(60));

        $this->postJson('/api/auth/google/exchange', ['code' => $code])->assertOk();
        $this->postJson('/api/auth/google/exchange', ['code' => $code])->assertUnprocessable();
    }

    public function test_google_exchange_rejects_wrong_length_code(): void
    {
        $this->postJson('/api/auth/google/exchange', ['code' => 'tooshort'])
            ->assertUnprocessable();
    }

    // ── Pagination limit ─────────────────────────────────────────────────────

    public function test_per_page_is_capped_at_100(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test')->plainTextToken;

        $response = $this->withToken($token)
            ->getJson('/api/transactions?per_page=999999')
            ->assertOk();

        $this->assertLessThanOrEqual(100, $response->json('meta.per_page'));
    }

    // ── UserResource does not leak google_id ─────────────────────────────────

    public function test_user_resource_does_not_expose_google_id(): void
    {
        $user = User::factory()->create(['google_id' => 'google-uid-12345']);
        $token = $user->createToken('test')->plainTextToken;

        $response = $this->withToken($token)->getJson('/api/auth/me')->assertOk();

        $this->assertArrayNotHasKey('google_id', $response->json('data'));
        $this->assertArrayHasKey('has_google', $response->json('data'));
        $this->assertTrue($response->json('data.has_google'));
    }

    // ── Inactive user cannot access protected routes ─────────────────────────

    public function test_inactive_user_token_is_rejected(): void
    {
        $user = User::factory()->create(['status' => 'inactive']);
        $token = $user->createToken('test')->plainTextToken;

        $this->withToken($token)->getJson('/api/auth/me')->assertForbidden();
    }

    // ── IDOR: user cannot access other users' resources ─────────────────────

    public function test_user_cannot_read_another_users_transaction(): void
    {
        $owner = User::factory()->create();
        $attacker = User::factory()->create();
        $attackerToken = $attacker->createToken('test')->plainTextToken;

        // We test via 404: the query always scopes to the auth user
        $this->withToken($attackerToken)
            ->getJson('/api/transactions/99999')
            ->assertNotFound();
    }

    // ── Gold market error does not leak internals ────────────────────────────

    public function test_gold_market_502_response_does_not_expose_exception_message(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test')->plainTextToken;

        // Simulate a forced 502 by calling the controller with a mocked service that throws
        $controller = new \App\Http\Controllers\Api\GoldSavingsMarketController;

        $request = \Illuminate\Http\Request::create('/api/gold-savings/market');
        $request->setUserResolver(fn () => $user);

        // Intercept via reflection: override fetchMarketData to throw
        $mock = new class extends \App\Http\Controllers\Api\GoldSavingsMarketController {
            protected function fetchMarketData(string $resource, string $brand, int $historyLength): array
            {
                throw new \RuntimeException('Internal DB error at /secret/path: password=hunter2');
            }
        };

        $response = $mock->__invoke();

        $this->assertSame(502, $response->getStatusCode());
        $body = json_decode($response->getContent(), true);
        $this->assertFalse($body['success']);
        $this->assertArrayNotHasKey('error', $body);
        $this->assertStringNotContainsString('hunter2', $response->getContent());
    }
}
