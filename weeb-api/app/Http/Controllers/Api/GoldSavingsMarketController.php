<?php

namespace App\Http\Controllers\Api;

use App\Http\Concerns\RespondsWithApi;
use App\Http\Controllers\Controller;
use Illuminate\Http\Client\RequestException;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Http;
use Throwable;

class GoldSavingsMarketController extends Controller
{
    use RespondsWithApi;

    public function __invoke(): JsonResponse
    {
        $resource = 'pegadaian';
        $brand = 'PEGADAIAN';
        $historyLength = max(7, min((int) request('history_length', 14), 30));

        try {
            $marketData = $this->fetchMarketData($resource, $brand, $historyLength);

            return $this->success($marketData, 'Gold savings market loaded.');
        } catch (Throwable $exception) {
            return response()->json([
                'success' => false,
                'message' => 'Gold savings market unavailable.',
                'error' => $exception->getMessage(),
            ], 502);
        }
    }

    protected function fetchMarketData(string $resource, string $brand, int $historyLength): array
    {
        $apiKey = (string) config('services.emas.api_key', '');

        if ($apiKey !== '') {
            try {
                return $this->fetchFromMaulanarApi($resource, $brand, $historyLength, $apiKey);
            } catch (RequestException $exception) {
                if (! in_array($exception->response?->status(), [401, 403], true)) {
                    throw $exception;
                }
            }
        }

        return $this->fetchFromLogamMuliaApi($resource, $historyLength);
    }

    protected function fetchFromMaulanarApi(string $resource, string $brand, int $historyLength, string $apiKey): array
    {
        $baseUrl = rtrim((string) config('services.emas.base_url', 'https://emas.maulanar.my.id'), '/');

        $client = Http::baseUrl($baseUrl)
            ->acceptJson()
            ->withHeaders(['X-API-Key' => $apiKey])
            ->timeout(20);

        $currentPayload = $client
            ->get("/api/prices/today/{$resource}")
            ->throw()
            ->json();

        $historyPayload = $client
            ->get('/api/prices', [
                'brand[eq]' => $brand,
                'resource[eq]' => $resource,
                'weight[eq]' => 1,
                'sort_by' => 'updated_at',
                'order' => 'desc',
                'limit' => $historyLength,
            ])
            ->throw()
            ->json();

        $currentRows = collect(data_get($currentPayload, 'data', []));
        $historyRows = collect(data_get($historyPayload, 'data', []));
        $latestRow = $currentRows
            ->filter(fn (array $row) => strtoupper((string) data_get($row, 'brand')) === $brand && (float) data_get($row, 'weight') === 1.0)
            ->sortByDesc(fn (array $row) => (string) ($row['updated_at'] ?? $row['date'] ?? ''))
            ->first();

        if (! $latestRow || $historyRows->isEmpty()) {
            throw new \RuntimeException('Data harga emas dari provider utama belum tersedia.');
        }

        return [
            'provider' => parse_url($baseUrl, PHP_URL_HOST) ?: $baseUrl,
            'resource' => $resource,
            'brand' => $brand,
            'current' => [
                'displayName' => 'Pegadaian',
                'materialType' => $brand,
                'weight' => data_get($latestRow, 'weight'),
                'weightUnit' => 'gram',
                'sellPrice' => data_get($latestRow, 'sell_price'),
                'buybackPrice' => data_get($latestRow, 'buyback_price'),
                'currency' => 'IDR',
                'recordedDate' => substr((string) data_get($latestRow, 'updated_at', data_get($latestRow, 'date', now()->toDateString())), 0, 10),
                'urlHomepage' => null,
            ],
            'history' => $historyRows
                ->map(fn (array $row) => [
                    'displayName' => ucfirst($resource),
                    'materialType' => $brand,
                    'weight' => data_get($row, 'weight'),
                    'weightUnit' => 'gram',
                    'sellPrice' => data_get($row, 'sell_price'),
                    'buybackPrice' => data_get($row, 'buyback_price'),
                    'currency' => 'IDR',
                    'recordedDate' => substr((string) data_get($row, 'updated_at', data_get($row, 'date', now()->toDateString())), 0, 10),
                    'urlHomepage' => null,
                ])
                ->values()
                ->all(),
        ];
    }

    protected function fetchFromLogamMuliaApi(string $resource, int $historyLength): array
    {
        $client = Http::baseUrl('https://logam-mulia-api.iamutaki.workers.dev')
            ->acceptJson()
            ->timeout(20);

        $currentPayload = $client
            ->get("/api/prices/{$resource}", ['refresh' => 'true'])
            ->throw()
            ->json();

        $historyPayload = $client
            ->get("/api/prices/{$resource}/history", ['page' => 1, 'length' => $historyLength])
            ->throw()
            ->json();

        $latestRow = collect(data_get($currentPayload, 'data', []))->first();
        $historyRows = collect(data_get($historyPayload, 'data', []));

        if (! $latestRow || $historyRows->isEmpty()) {
            throw new \RuntimeException('Data harga emas dari provider fallback belum tersedia.');
        }

        return [
            'provider' => 'logam-mulia-api.iamutaki.workers.dev',
            'resource' => $resource,
            'brand' => data_get($latestRow, 'materialType', 'UNKNOWN'),
            'current' => [
                'displayName' => data_get($latestRow, 'displayName', ucfirst($resource)),
                'materialType' => data_get($latestRow, 'materialType', 'UNKNOWN'),
                'weight' => data_get($latestRow, 'weight'),
                'weightUnit' => data_get($latestRow, 'weightUnit', 'gram'),
                'sellPrice' => data_get($latestRow, 'sellPrice'),
                'buybackPrice' => data_get($latestRow, 'buybackPrice'),
                'currency' => data_get($latestRow, 'currency', 'IDR'),
                'recordedDate' => data_get($latestRow, 'recordedDate'),
                'urlHomepage' => data_get($latestRow, 'urlHomepage'),
            ],
            'history' => $historyRows
                ->map(fn (array $row) => [
                    'displayName' => data_get($row, 'displayName', ucfirst($resource)),
                    'materialType' => data_get($row, 'materialType', 'UNKNOWN'),
                    'weight' => data_get($row, 'weight'),
                    'weightUnit' => data_get($row, 'weightUnit', 'gram'),
                    'sellPrice' => data_get($row, 'sellPrice'),
                    'buybackPrice' => data_get($row, 'buybackPrice'),
                    'currency' => data_get($row, 'currency', 'IDR'),
                    'recordedDate' => data_get($row, 'recordedDate'),
                    'urlHomepage' => data_get($row, 'urlHomepage'),
                ])
                ->values()
                ->all(),
        ];
    }
}
