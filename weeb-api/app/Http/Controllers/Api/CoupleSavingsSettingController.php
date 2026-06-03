<?php

namespace App\Http\Controllers\Api;

use App\Http\Concerns\RespondsWithApi;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateCoupleSavingsSettingRequest;
use App\Http\Resources\CoupleSavingsSettingResource;
use App\Models\CoupleSavingsSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CoupleSavingsSettingController extends Controller
{
    use RespondsWithApi;

    public function show(): JsonResponse
    {
        $setting = $this->setting();

        return $this->success(
            new CoupleSavingsSettingResource($setting->load(['partnerOne', 'partnerTwo'])),
            'Couple savings setting loaded.',
        );
    }

    public function update(UpdateCoupleSavingsSettingRequest $request): JsonResponse
    {
        if (($request->user()->role ?? 'user') !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Hanya admin yang bisa mengatur pasangan tabungan berdua.',
                'data' => null,
            ], 403);
        }

        $setting = $this->setting();
        $setting->fill([
            ...$request->validated(),
            'updated_by' => $request->user()->id,
        ]);

        if (! $setting->exists || ! $setting->created_by) {
            $setting->created_by = $request->user()->id;
        }

        $setting->save();

        return $this->success(
            new CoupleSavingsSettingResource($setting->fresh()->load(['partnerOne', 'partnerTwo'])),
            'Couple savings setting updated.',
        );
    }

    private function setting(): CoupleSavingsSetting
    {
        return CoupleSavingsSetting::query()->firstOrNew([]);
    }
}
