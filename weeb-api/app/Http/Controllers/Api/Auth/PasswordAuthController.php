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
use Illuminate\Support\Facades\Hash;

class PasswordAuthController extends Controller
{
    use RespondsWithApi;

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
}
