<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public static $wrap = null;

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'role' => $this->role ?? 'user',
            'status' => $this->status ?? 'active',
            'has_google' => ! empty($this->google_id),
            'avatar_url' => $this->optimizedAvatarUrl(),
            'email_verified_at' => $this->email_verified_at?->toISOString(),
            'last_login_at' => $this->last_login_at?->toISOString(),
            'profile' => $this->whenLoaded('profile', fn () => new UserProfileResource($this->profile)),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }

    private function optimizedAvatarUrl(): ?string
    {
        if (empty($this->avatar_url)) {
            return null;
        }

        $url = $this->avatar_url;

        if (! str_contains($url, 'googleusercontent.com')) {
            return $url;
        }

        $separator = str_contains($url, '?') ? '&' : '?';

        return "{$url}{$separator}sz=96";
    }
}
