<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PasswordRegisterTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_register_with_valid_details(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name' => 'Wibisana Dev',
            'email' => 'wibisana@weeb.test',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.user.email', 'wibisana@weeb.test')
            ->assertJsonPath('data.user.name', 'Wibisana Dev')
            ->assertJsonStructure(['data' => ['token', 'user' => ['id', 'email', 'profile']]]);

        $this->assertDatabaseHas('users', [
            'email' => 'wibisana@weeb.test',
            'name' => 'Wibisana Dev',
            'role' => 'user',
            'status' => 'active',
        ]);

        $user = User::query()->where('email', 'wibisana@weeb.test')->first();
        
        $this->assertDatabaseHas('user_profiles', [
            'user_id' => $user->id,
        ]);

        $this->assertDatabaseHas('personal_access_tokens', [
            'tokenable_id' => $user->id,
            'name' => 'password-auth',
        ]);
    }

    public function test_registration_requires_name_email_and_password(): void
    {
        $this->postJson('/api/auth/register', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['name', 'email', 'password']);
    }

    public function test_registration_requires_matching_password_confirmation(): void
    {
        $this->postJson('/api/auth/register', [
            'name' => 'Wibisana Dev',
            'email' => 'wibisana@weeb.test',
            'password' => 'password123',
            'password_confirmation' => 'different-password',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['password']);
    }

    public function test_cannot_register_with_already_taken_email(): void
    {
        User::factory()->create([
            'email' => 'wibisana@weeb.test',
        ]);

        $this->postJson('/api/auth/register', [
            'name' => 'Another User',
            'email' => 'wibisana@weeb.test',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email']);
    }
}
