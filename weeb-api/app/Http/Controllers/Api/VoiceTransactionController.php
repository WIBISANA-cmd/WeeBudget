<?php

namespace App\Http\Controllers\Api;

use App\Http\Concerns\RespondsWithApi;
use App\Http\Controllers\Controller;
use App\Services\AI\ElevenLabsAudioTranscriber;
use App\Services\AI\VoiceTransactionParser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

class VoiceTransactionController extends Controller
{
    use RespondsWithApi;

    public function parse(Request $request, VoiceTransactionParser $parser): JsonResponse
    {
        $request->validate([
            'transcript' => ['required', 'string', 'max:500'],
        ]);

        try {
            $result = $parser->parse($request->user(), $request->input('transcript'));

            return $this->success($result, 'Voice transcript parsed successfully.');
        } catch (Throwable $e) {
            $status = str_contains($e->getMessage(), '429') ? 429 : 500;

            return $this->error($e->getMessage(), $status);
        }
    }

    public function transcribeAudio(
        Request $request,
        ElevenLabsAudioTranscriber $transcriber,
        VoiceTransactionParser $parser
    ): JsonResponse {
        $request->validate([
            'audio' => ['required', 'file', 'max:10240'],
        ]);

        try {
            $transcript = $transcriber->transcribe($request->file('audio'));
            $result = $parser->parse($request->user(), $transcript);

            return $this->success($result, 'Audio transcribed and parsed successfully.');
        } catch (Throwable $e) {
            $status = str_contains($e->getMessage(), '429') ? 429 : 500;

            return $this->error($e->getMessage(), $status);
        }
    }
}
