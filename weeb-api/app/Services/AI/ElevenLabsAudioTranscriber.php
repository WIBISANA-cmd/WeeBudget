<?php

namespace App\Services\AI;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class ElevenLabsAudioTranscriber
{
    public function transcribe(UploadedFile $file): string
    {
        $apiKey = config('services.elevenlabs.api_key');

        if (empty($apiKey)) {
            throw new RuntimeException('ELEVENLABS_API_KEY belum dikonfigurasi.');
        }

        $url = 'https://api.elevenlabs.io/v1/speech-to-text';

        $response = Http::withHeaders([
            'xi-api-key' => $apiKey,
        ])
        ->timeout(30)
        ->attach(
            'file',
            file_get_contents($file->getRealPath()),
            $file->getClientOriginalName() ?: 'recording.webm'
        )
        ->post($url, [
            'model_id' => 'scribe_v1',
            'language_code' => 'id',
        ]);

        if ($response->failed()) {
            Log::error('ElevenLabs Speech-to-Text API failed', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            $errorMsg = $response->json('detail.message') ?? $response->json('message') ?? 'Status ' . $response->status();

            throw new RuntimeException('Gagal memproses audio via ElevenLabs Speech-to-Text: ' . $errorMsg);
        }

        $text = $response->json('text');

        if (empty($text)) {
            throw new RuntimeException('Suara tidak terdengar atau tidak dapat diterjemahkan menjadi teks.');
        }

        return trim($text);
    }
}
