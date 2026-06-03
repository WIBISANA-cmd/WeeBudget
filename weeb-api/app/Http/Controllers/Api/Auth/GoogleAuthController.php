<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Concerns\RespondsWithApi;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\UserProfile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;

class GoogleAuthController extends Controller
{
    use RespondsWithApi;

    public function redirect(): JsonResponse
    {
        $url = Socialite::driver('google')
            ->stateless()
            ->redirect()
            ->getTargetUrl();

        return $this->success(['url' => $url], 'Google auth URL generated.');
    }

    public function callback(): RedirectResponse
    {
        $googleUser = Socialite::driver('google')->stateless()->user();

        $user = User::query()->updateOrCreate(
            ['email' => $googleUser->getEmail()],
            [
                'name' => $googleUser->getName() ?: $googleUser->getNickname() ?: 'Teman WeeB',
                'google_id' => $googleUser->getId(),
                'avatar_url' => $googleUser->getAvatar(),
                'email_verified_at' => now(),
                'role' => 'user',
                'status' => 'active',
                'last_login_at' => now(),
                'password' => Hash::make(Str::password(32)),
            ],
        );

        UserProfile::query()->firstOrCreate(['user_id' => $user->id]);

        $token = $user->createToken('google-auth')->plainTextToken;
        $frontendUrl = rtrim(env('FRONTEND_URL', 'http://127.0.0.1:5173'), '/');

        return redirect()->away("{$frontendUrl}/auth/google/callback?token=".urlencode($token));
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        return $this->success([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role ?? 'user',
            'status' => $user->status ?? 'active',
            'avatar_url' => $user->avatar_url,
        ], 'Authenticated user loaded.');
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()?->currentAccessToken()?->delete();

        return $this->success(null, 'Logged out.');
    }
}
