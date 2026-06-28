<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Concerns\RespondsWithApi;
use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Models\UserProfile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
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

        $token = $user->createToken('google-auth', ['*'], null)->plainTextToken;

        // Store token under a short-lived, single-use code to avoid
        // exposing the real token in URLs (browser history, server logs, Referer).
        $code = Str::random(64);
        Cache::put("google_auth_code:{$code}", $token, now()->addSeconds(60));

        $frontendUrl = rtrim(config('app.frontend_url', 'http://127.0.0.1:5173'), '/');

        return redirect()->away("{$frontendUrl}/auth/google/callback?code=".urlencode($code));
    }

    public function exchange(Request $request): JsonResponse
    {
        $request->validate(['code' => ['required', 'string', 'size:64']]);

        $cacheKey = "google_auth_code:{$request->input('code')}";
        $token = Cache::pull($cacheKey);

        if (! $token) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid or expired code.',
                'data' => null,
            ], 422);
        }

        return $this->success(['token' => $token], 'Token exchanged.');
    }

    public function me(Request $request): JsonResponse
    {
        return $this->success(new UserResource($request->user()->load('profile')), 'Authenticated user loaded.');
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()?->currentAccessToken()?->delete();

        return $this->success(null, 'Logged out.');
    }
}
