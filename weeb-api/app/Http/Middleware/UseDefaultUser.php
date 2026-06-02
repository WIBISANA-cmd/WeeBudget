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
                $request->setUserResolver(fn () => $token->tokenable);

                return $next($request);
            }
        }

        $email = config('app.default_user_email', env('WEEB_DEFAULT_USER_EMAIL', 'local@weeb.id'));

        $user = User::query()->firstOrCreate(
            ['email' => $email],
            [
                'name' => env('WEEB_DEFAULT_USER_NAME', 'Teman WeeB'),
                'password' => Hash::make(Str::password(32)),
            ],
        );

        UserProfile::query()->firstOrCreate(['user_id' => $user->id]);

        $request->setUserResolver(fn () => $user);

        return $next($request);
    }
}
