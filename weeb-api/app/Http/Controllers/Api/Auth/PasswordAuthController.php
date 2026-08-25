<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Concerns\RespondsWithApi;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Models\UserProfile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;

class PasswordAuthController extends Controller
{
    use RespondsWithApi;

    private const OTP_TTL_MINUTES = 15;

    private const OTP_RESEND_SECONDS = 60;

    private const OTP_MAX_ATTEMPTS = 5;

    public function login(LoginRequest $request): JsonResponse
    {
        $credentials = $request->validated();
        $user = User::query()->where('email', $credentials['email'])->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Email atau password tidak sesuai.',
                'data' => null,
            ], 422);
        }

        if (($user->status ?? 'active') !== 'active') {
            return response()->json([
                'success' => false,
                'message' => 'Akun tidak aktif. Hubungi administrator.',
                'data' => null,
            ], 403);
        }

        $user->forceFill(['last_login_at' => now()])->save();
        $token = $user->createToken('password-auth', ['*'], null)->plainTextToken;

        return $this->success([
            'token' => $token,
            'user' => new UserResource($user->fresh()->load('profile')),
        ], 'Login successful.');
    }

    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $user = User::query()->create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => 'user',
            'status' => 'active',
            'email_verified_at' => now(),
            'last_login_at' => now(),
        ]);

        UserProfile::query()->create(['user_id' => $user->id]);

        $token = $user->createToken('password-auth', ['*'], null)->plainTextToken;

        return $this->success([
            'token' => $token,
            'user' => new UserResource($user->fresh()->load('profile')),
        ], 'Registrasi berhasil.');
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $email = strtolower($request->validate([
            'email' => ['required', 'string', 'email', 'max:255'],
        ])['email']);

        // Balasan selalu sama agar email terdaftar/tidak tidak bisa ditebak.
        $generic = 'Jika email terdaftar, kode OTP sudah dikirim. Cek inbox atau folder spam.';

        $user = User::query()->whereRaw('LOWER(email) = ?', [$email])->first();
        if (! $user || ($user->status ?? 'active') !== 'active') {
            return $this->success(null, $generic);
        }

        $existing = DB::table('password_reset_tokens')->where('email', $user->email)->first();
        if ($existing && now()->diffInSeconds($existing->created_at, true) < self::OTP_RESEND_SECONDS) {
            return $this->success(null, $generic);
        }

        $otp = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        DB::table('password_reset_tokens')->updateOrInsert(
            ['email' => $user->email],
            ['token' => Hash::make($otp), 'created_at' => now()],
        );
        RateLimiter::clear($this->otpLimiterKey($user->email));

        Mail::raw(
            "Halo {$user->name},\n\n"
            ."Kode OTP untuk reset password akun WeeB kamu adalah: {$otp}\n\n"
            .'Kode berlaku '.self::OTP_TTL_MINUTES." menit dan hanya bisa dipakai sekali.\n"
            ."Jangan bagikan kode ini ke siapa pun. Abaikan email ini jika kamu tidak meminta reset password.",
            fn ($message) => $message->to($user->email)->subject('Kode OTP Reset Password WeeB'),
        );

        return $this->success(null, $generic);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'string', 'email', 'max:255'],
            'otp' => ['required', 'string', 'digits:6'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $email = strtolower($validated['email']);
        $user = User::query()->whereRaw('LOWER(email) = ?', [$email])->first();
        $invalid = fn () => $this->error('Kode OTP salah atau sudah kedaluwarsa.', 422);

        if (! $user) {
            return $invalid();
        }

        $key = $this->otpLimiterKey($user->email);
        if (RateLimiter::tooManyAttempts($key, self::OTP_MAX_ATTEMPTS)) {
            return $this->error('Terlalu banyak percobaan. Minta kode OTP baru.', 429);
        }

        $record = DB::table('password_reset_tokens')->where('email', $user->email)->first();
        $expired = $record && now()->diffInMinutes($record->created_at, true) > self::OTP_TTL_MINUTES;

        if (! $record || $expired || ! Hash::check($validated['otp'], $record->token)) {
            RateLimiter::hit($key, self::OTP_TTL_MINUTES * 60);

            if ($expired) {
                DB::table('password_reset_tokens')->where('email', $user->email)->delete();
            }

            return $invalid();
        }

        $user->forceFill(['password' => Hash::make($validated['password'])])->save();

        DB::table('password_reset_tokens')->where('email', $user->email)->delete();
        RateLimiter::clear($key);
        $user->tokens()->delete();

        return $this->success(null, 'Password berhasil diperbarui. Silakan login dengan password baru.');
    }

    private function otpLimiterKey(string $email): string
    {
        return 'password-reset-otp:'.sha1(strtolower($email));
    }
}
