<?php

namespace App\Http\Middleware;

use App\Models\User;
use App\Models\UserProfile;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\Response;

class UseDefaultUser
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->bearerToken()) {
            $token = PersonalAccessToken::findToken($request->bearerToken());
            if ($token?->tokenable instanceof User) {
                if (($token->tokenable->status ?? 'active') !== 'active') {
                    return response()->json([
                        'success' => false,
                        'message' => 'Akun tidak aktif. Hubungi administrator.',
                        'data' => null,
                    ], 403);
                }

                $request->setUserResolver(fn () => $token->tokenable);

                return $next($request);
            }
        }

        if (! config('weeb.allow_guest_user', false)) {
            return response()->json([
                'success' => false,
                'message' => 'Login required.',
                'data' => null,
            ], 401);
        }

        $email = config('weeb.default_user_email', 'local@weeb.id');

        $user = User::query()->firstOrCreate(
            ['email' => $email],
            [
                'name' => config('weeb.default_user_name', 'Teman WeeB'),
                'password' => Hash::make(Str::password(32)),
            ],
        );

        UserProfile::query()->firstOrCreate(['user_id' => $user->id]);

        $request->setUserResolver(fn () => $user);

        return $next($request);
    }
}
