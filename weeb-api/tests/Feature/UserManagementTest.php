<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_manage_users(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $token = $admin->createToken('test')->plainTextToken;

        $createdId = $this->withToken($token)
            ->postJson('/api/users', [
                'name' => 'User Baru',
                'email' => 'baru@weeb.test',
                'password' => 'password123',
                'role' => 'user',
                'status' => 'active',
            ])
            ->assertCreated()
            ->assertJsonPath('data.email', 'baru@weeb.test')
            ->json('data.id');

        $this->withToken($token)
            ->putJson("/api/users/{$createdId}", [
                'name' => 'User Update',
                'email' => 'update@weeb.test',
                'password' => '',
                'role' => 'admin',
                'status' => 'inactive',
            ])
            ->assertOk()
            ->assertJsonPath('data.role', 'admin')
            ->assertJsonPath('data.status', 'inactive');

        $this->withToken($token)
            ->getJson('/api/users')
            ->assertOk()
            ->assertJsonPath('meta.total', 2);
    }

    public function test_user_cannot_delete_their_current_account(): void
    {
        $user = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $token = $user->createToken('test')->plainTextToken;

        $this->withToken($token)
            ->deleteJson("/api/users/{$user->id}")
            ->assertUnprocessable();
    }

    public function test_non_admin_cannot_manage_users(): void
    {
        $user = User::factory()->create(['role' => 'user', 'status' => 'active']);
        $token = $user->createToken('test')->plainTextToken;

        $this->withToken($token)
            ->getJson('/api/users')
            ->assertForbidden();
    }
}
