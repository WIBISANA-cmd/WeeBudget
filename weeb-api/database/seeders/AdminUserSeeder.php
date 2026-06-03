<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\UserProfile;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        $email = env('WEEB_ADMIN_EMAIL');
        $password = env('WEEB_ADMIN_PASSWORD');

        if (! $email || ! $password) {
            return;
        }

        $user = User::query()->updateOrCreate(
            ['email' => $email],
            [
                'name' => env('WEEB_ADMIN_NAME', 'Admin WeeBudget'),
                'password' => Hash::make($password),
                'email_verified_at' => now(),
                'role' => 'admin',
                'status' => 'active',
            ],
        );

        UserProfile::query()->firstOrCreate(['user_id' => $user->id]);
    }
}
