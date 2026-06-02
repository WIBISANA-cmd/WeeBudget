<?php

namespace App\Http\Controllers\Api;

use App\Http\Concerns\RespondsWithApi;
use App\Http\Controllers\Controller;
use App\Http\Requests\Profile\UpdateProfileRequest;
use App\Http\Resources\UserResource;
use Illuminate\Http\JsonResponse;

class ProfileController extends Controller
{
    use RespondsWithApi;

    public function show(): JsonResponse
    {
        return $this->success(new UserResource(request()->user()->load('profile')), 'Profile loaded.');
    }

    public function update(UpdateProfileRequest $request): JsonResponse
    {
        $user = $request->user();
        $data = $request->validated();

        if (array_key_exists('name', $data)) {
            $user->update(['name' => $data['name']]);
            unset($data['name']);
        }

        $user->profile()->updateOrCreate(['user_id' => $user->id], $data);

        return $this->success(new UserResource($user->fresh()->load('profile')), 'Profile updated.');
    }
}
