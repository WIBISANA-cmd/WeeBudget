<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAdminUser
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            return response()->json([
                'success' => false,
                'message' => 'Login diperlukan.',
                'data' => null,
            ], 401);
        }

        if (($user->role ?? 'user') !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Akses ditolak. Hanya administrator yang diizinkan.',
                'data' => null,
            ], 403);
        }

        return $next($request);
    }
}
