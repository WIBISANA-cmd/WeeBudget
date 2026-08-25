<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class PasswordResetOtpTest extends TestCase
{
    use RefreshDatabase;

    private function makeUser(): User
    {
        return User::factory()->create([
            'email' => 'demo@weeb.test',
            'password' => Hash::make('password123'),
            'status' => 'active',
        ]);
    }

    private function sentMessages()
    {
        return Mail::mailer()->getSymfonyTransport()->messages();
    }

    private function requestOtp(string $email = 'demo@weeb.test'): ?string
    {
        $before = $this->sentMessages()->count();
        $this->postJson('/api/auth/forgot-password', ['email' => $email])->assertOk();

        $body = optional($this->sentMessages()->slice($before)->last())->getOriginalMessage()?->getTextBody() ?? '';
        preg_match('/\b(\d{6})\b/', $body, $matches);

        return $matches[1] ?? null;
    }

    public function test_otp_is_emailed_and_resets_password(): void
    {
        $user = $this->makeUser();
        $otp = $this->requestOtp();
        $this->assertNotNull($otp);
        $this->assertDatabaseHas('password_reset_tokens', ['email' => $user->email]);

        $this->postJson('/api/auth/reset-password', [
            'email' => 'DEMO@weeb.test',
            'otp' => $otp,
            'password' => 'newpassword123',
            'password_confirmation' => 'newpassword123',
        ])->assertOk();

        $this->assertTrue(Hash::check('newpassword123', $user->fresh()->password));
        $this->assertDatabaseMissing('password_reset_tokens', ['email' => $user->email]);

        $this->postJson('/api/auth/login', ['email' => $user->email, 'password' => 'newpassword123'])->assertOk();
    }

    public function test_unknown_email_does_not_leak_and_sends_nothing(): void
    {
        $before = $this->sentMessages()->count();
        $this->postJson('/api/auth/forgot-password', ['email' => 'nobody@weeb.test'])->assertOk();
        $this->assertSame($before, $this->sentMessages()->count());
    }

    public function test_wrong_otp_is_rejected_and_locked_after_five_attempts(): void
    {
        $user = $this->makeUser();
        $otp = $this->requestOtp();

        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/auth/reset-password', [
                'email' => $user->email,
                'otp' => '000000' === $otp ? '111111' : '000000',
                'password' => 'newpassword123',
                'password_confirmation' => 'newpassword123',
            ])->assertUnprocessable();
        }

        // Kode benar pun ditolak setelah limit tercapai.
        $this->postJson('/api/auth/reset-password', [
            'email' => $user->email,
            'otp' => $otp,
            'password' => 'newpassword123',
            'password_confirmation' => 'newpassword123',
        ])->assertStatus(429);

        $this->assertTrue(Hash::check('password123', $user->fresh()->password));
    }

    public function test_expired_otp_is_rejected(): void
    {
        $user = $this->makeUser();
        $otp = $this->requestOtp();

        DB::table('password_reset_tokens')->where('email', $user->email)
            ->update(['created_at' => now()->subMinutes(16)]);

        $this->postJson('/api/auth/reset-password', [
            'email' => $user->email,
            'otp' => $otp,
            'password' => 'newpassword123',
            'password_confirmation' => 'newpassword123',
        ])->assertUnprocessable();

        $this->assertTrue(Hash::check('password123', $user->fresh()->password));
        $this->assertDatabaseMissing('password_reset_tokens', ['email' => $user->email]);
    }

    public function test_reset_revokes_existing_api_tokens(): void
    {
        $user = $this->makeUser();
        $user->createToken('password-auth');
        $otp = $this->requestOtp();

        $this->postJson('/api/auth/reset-password', [
            'email' => $user->email,
            'otp' => $otp,
            'password' => 'newpassword123',
            'password_confirmation' => 'newpassword123',
        ])->assertOk();

        $this->assertSame(0, $user->tokens()->count());
    }
}
