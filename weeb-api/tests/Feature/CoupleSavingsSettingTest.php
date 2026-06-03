<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CoupleSavingsSettingTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_set_couple_savings_partners(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $partnerOne = User::factory()->create(['status' => 'active']);
        $partnerTwo = User::factory()->create(['status' => 'active']);
        $token = $admin->createToken('test')->plainTextToken;

        $this->withToken($token)
            ->putJson('/api/couple-savings/setting', [
                'partner_one_user_id' => $partnerOne->id,
                'partner_two_user_id' => $partnerTwo->id,
            ])
            ->assertOk()
            ->assertJsonPath('data.partner_one.email', $partnerOne->email)
            ->assertJsonPath('data.partner_two.email', $partnerTwo->email);
    }

    public function test_non_admin_cannot_set_couple_savings_partners(): void
    {
        $user = User::factory()->create(['role' => 'user', 'status' => 'active']);
        $partnerOne = User::factory()->create(['status' => 'active']);
        $partnerTwo = User::factory()->create(['status' => 'active']);
        $token = $user->createToken('test')->plainTextToken;

        $this->withToken($token)
            ->putJson('/api/couple-savings/setting', [
                'partner_one_user_id' => $partnerOne->id,
                'partner_two_user_id' => $partnerTwo->id,
            ])
            ->assertForbidden();
    }

    public function test_couple_savings_partners_must_be_different_users(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $partner = User::factory()->create(['status' => 'active']);
        $token = $admin->createToken('test')->plainTextToken;

        $this->withToken($token)
            ->putJson('/api/couple-savings/setting', [
                'partner_one_user_id' => $partner->id,
                'partner_two_user_id' => $partner->id,
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('partner_two_user_id');
    }
}
