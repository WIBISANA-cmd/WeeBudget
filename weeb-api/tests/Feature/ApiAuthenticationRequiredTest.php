<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApiAuthenticationRequiredTest extends TestCase
{
    use RefreshDatabase;

    public function test_api_requires_login_before_accessing_protected_routes(): void
    {
        $this->getJson('/api/auth/me')
            ->assertUnauthorized()
            ->assertJson([
                'success' => false,
                'message' => 'Login required.',
                'data' => null,
            ]);
    }

    public function test_api_allows_access_with_valid_token(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test')->plainTextToken;

        $this->withToken($token)
            ->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('data.email', $user->email);
    }
}
