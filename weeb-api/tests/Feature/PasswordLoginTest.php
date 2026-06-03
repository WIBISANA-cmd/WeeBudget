<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class PasswordLoginTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_login_with_registered_email_and_password(): void
    {
        $user = User::factory()->create([
            'email' => 'demo@weeb.test',
            'password' => Hash::make('password123'),
            'status' => 'active',
        ]);

        $this->postJson('/api/auth/login', [
            'email' => 'demo@weeb.test',
            'password' => 'password123',
        ])
            ->assertOk()
            ->assertJsonPath('data.user.email', $user->email)
            ->assertJsonStructure(['data' => ['token']]);

        $this->assertDatabaseHas('personal_access_tokens', [
            'tokenable_id' => $user->id,
            'name' => 'password-auth',
            'expires_at' => null,
        ]);
    }

    public function test_inactive_user_cannot_login_with_password(): void
    {
        User::factory()->create([
            'email' => 'inactive@weeb.test',
            'password' => Hash::make('password123'),
            'status' => 'inactive',
        ]);

        $this->postJson('/api/auth/login', [
            'email' => 'inactive@weeb.test',
            'password' => 'password123',
        ])->assertForbidden();
    }

    public function test_invalid_password_is_rejected(): void
    {
        User::factory()->create([
            'email' => 'demo@weeb.test',
            'password' => Hash::make('password123'),
            'status' => 'active',
        ]);

        $this->postJson('/api/auth/login', [
            'email' => 'demo@weeb.test',
            'password' => 'wrong-password',
        ])->assertUnprocessable();
    }
}
