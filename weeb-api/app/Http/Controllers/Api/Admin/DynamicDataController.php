<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Concerns\RespondsWithApi;
use App\Http\Controllers\Controller;
use App\Models\DynEntity;
use App\Services\DynamicSchema\DynamicStorageEngine;
use App\Services\DynamicSchema\MetadataService;
use App\Services\DynamicSchema\MetadataValidator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Throwable;

class DynamicDataController extends Controller
{
    use RespondsWithApi;

    public function __construct(
        protected MetadataService $metadataService,
        protected MetadataValidator $validator,
        protected DynamicStorageEngine $storageEngine
    ) {}

    /**
     * List, search, filter, or export records for an entity.
     */
    public function index(Request $request, string $slug): JsonResponse|StreamedResponse
    {
        $entity = $this->resolveEntity($slug);
        if ($response = $this->guardEntityAccess($entity)) {
            return $response;
        }

        // CSV Export or Template
        if ($request->query('format') === 'csv') {
            if ($request->boolean('template')) {
                return $this->downloadTemplate($entity);
            }

            if (! $entity->hasFeature('export')) {
                return response()->json([
                    'success' => false,
                    'message' => "Fitur ekspor ('export') dinonaktifkan pada entitas ini.",
                    'data' => null,
                ], 403);
            }

            return $this->exportCsv($request, $entity);
        }

        // Extract f_<key> filters
        $filters = [];
        foreach ($request->query() as $k => $v) {
            if (str_starts_with($k, 'f_')) {
                $fieldKey = substr($k, 2);
                $filters[$fieldKey] = $v;
            }
        }

        try {
            $params = [
                'search' => $request->query('search'),
                'filters' => $filters,
                'sort' => $request->query('sort'),
                'dir' => $request->query('dir', 'desc'),
                'page' => (int) $request->query('page', 1),
                'pageSize' => (int) $request->query('pageSize', $request->query('per_page', 20)),
            ];

            $result = $this->storageEngine->paginate($entity, $params);

            return $this->success($result['items'], 'Data berhasil dimuat.', 200, [
                'current_page' => $result['page'],
                'last_page' => $result['lastPage'],
                'per_page' => $result['pageSize'],
                'total' => $result['total'],
            ]);
        } catch (Throwable $e) {
            return $this->handleException($e);
        }
    }

    /**
     * Read a single record.
     */
    public function show(string $slug, int|string $id): JsonResponse
    {
        $entity = $this->resolveEntity($slug);
        if ($response = $this->guardEntityAccess($entity)) {
            return $response;
        }

        try {
            $record = $this->storageEngine->find($entity, $id);

            return $this->success($record, 'Data berhasil dimuat.');
        } catch (Throwable $e) {
            return $this->handleException($e);
        }
    }

    /**
     * Create a record.
     */
    public function store(Request $request, string $slug): JsonResponse
    {
        $entity = $this->resolveEntity($slug);
        if ($response = $this->guardEntityAccess($entity, 'create')) {
            return $response;
        }

        try {
            $validated = $this->validator->validate($entity, $request->all(), false);
            $record = $this->storageEngine->create($entity, $validated, $request->user());

            return $this->success($record, 'Data berhasil ditambahkan.', 201);
        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi metadata gagal: '.implode(', ', array_map(fn ($errs) => implode(' ', $errs), $e->errors())),
                'errors' => $e->errors(),
                'data' => null,
            ], 400);
        } catch (Throwable $e) {
            return $this->handleException($e);
        }
    }

    /**
     * Update an existing record (partial merge).
     */
    public function update(Request $request, string $slug, int|string $id): JsonResponse
    {
        $entity = $this->resolveEntity($slug);
        if ($response = $this->guardEntityAccess($entity, 'edit')) {
            return $response;
        }

        try {
            $validated = $this->validator->validate($entity, $request->all(), true, $id);
            $record = $this->storageEngine->update($entity, $id, $validated);

            return $this->success($record, 'Data berhasil diperbarui.');
        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi metadata gagal: '.implode(', ', array_map(fn ($errs) => implode(' ', $errs), $e->errors())),
                'errors' => $e->errors(),
                'data' => null,
            ], 400);
        } catch (Throwable $e) {
            return $this->handleException($e);
        }
    }

    /**
     * Delete a record.
     */
    public function destroy(string $slug, int|string $id): JsonResponse
    {
        $entity = $this->resolveEntity($slug);
        if ($response = $this->guardEntityAccess($entity, 'delete')) {
            return $response;
        }

        try {
            $this->storageEngine->delete($entity, $id);

            return $this->deleted('Data berhasil dihapus.');
        } catch (Throwable $e) {
            return $this->handleException($e);
        }
    }

    /**
     * Bulk import CSV data.
     */
    public function import(Request $request, string $slug): JsonResponse
    {
        $entity = $this->resolveEntity($slug);
        if ($response = $this->guardEntityAccess($entity, 'import')) {
            return $response;
        }

        $file = $request->file('file');
        $csvText = $request->input('csv_text');

        if (! $file && empty($csvText)) {
            return response()->json([
                'success' => false,
                'message' => 'File CSV atau teks CSV wajib disertakan.',
                'data' => null,
            ], 400);
        }

        $content = $file ? file_get_contents($file->getRealPath()) : $csvText;
        // Strip BOM if present
        $content = preg_replace('/^\xEF\xBB\xBF/', '', $content);

        $lines = preg_split('/\r\n|\r|\n/', trim($content));
        if (empty($lines) || count($lines) < 2) {
            return response()->json([
                'success' => false,
                'message' => 'CSV harus memiliki minimal baris header dan 1 baris data.',
                'data' => null,
            ], 400);
        }

        // Limit import row count
        $maxImportRows = 1000;
        if (count($lines) - 1 > $maxImportRows) {
            return response()->json([
                'success' => false,
                'message' => "Maksimal {$maxImportRows} baris data per impor.",
                'data' => null,
            ], 400);
        }

        $headers = str_getcsv(array_shift($lines));
        $headers = array_map(fn ($h) => trim(str_replace(['"', "'"], '', $h)), $headers);

        $fields = $entity->fields->keyBy('key');
        $fieldMap = [];
        foreach ($headers as $colIdx => $headerName) {
            $match = $fields->first(fn ($f) => strtolower($f->key) === strtolower($headerName) || strtolower($f->label) === strtolower($headerName));
            if ($match) {
                $fieldMap[$colIdx] = $match->key;
            }
        }

        $successCount = 0;
        $rowErrors = [];

        foreach ($lines as $lineIndex => $line) {
            $rowNumber = $lineIndex + 2; // 1-indexed including header
            if (trim($line) === '') {
                continue;
            }

            $values = str_getcsv($line);
            $rawRow = [];

            foreach ($fieldMap as $colIdx => $key) {
                $rawVal = $values[$colIdx] ?? null;
                if ($rawVal !== null) {
                    $rawVal = trim($rawVal);
                    // Handle array separated values (e.g. pipe | or semicolon ;)
                    $field = $fields[$key] ?? null;
                    if ($field && in_array($field->type, ['multiselect', 'relation_many'], true)) {
                        $rawRow[$key] = array_values(array_filter(array_map('trim', preg_split('/[|;]/', $rawVal))));
                    } else {
                        $rawRow[$key] = $rawVal;
                    }
                }
            }

            try {
                $validated = $this->validator->validate($entity, $rawRow, false);
                $this->storageEngine->create($entity, $validated, $request->user());
                $successCount++;
            } catch (ValidationException $e) {
                $messages = [];
                foreach ($e->errors() as $fieldKey => $errs) {
                    $messages[] = implode(' ', $errs);
                }
                $rowErrors[] = [
                    'row' => $rowNumber,
                    'message' => implode(', ', $messages),
                ];
            } catch (Throwable $e) {
                $rowErrors[] = [
                    'row' => $rowNumber,
                    'message' => $e->getMessage(),
                ];
            }
        }

        return $this->success([
            'imported' => $successCount,
            'failed' => count($rowErrors),
            'errors' => $rowErrors,
        ], "Impor selesai: {$successCount} berhasil, ".count($rowErrors).' gagal.');
    }

    /**
     * Export records to CSV respecting active filters.
     */
    private function exportCsv(Request $request, DynEntity $entity): StreamedResponse
    {
        $filters = [];
        foreach ($request->query() as $k => $v) {
            if (str_starts_with($k, 'f_')) {
                $filters[substr($k, 2)] = $v;
            }
        }

        $params = [
            'search' => $request->query('search'),
            'filters' => $filters,
            'sort' => $request->query('sort'),
            'dir' => $request->query('dir', 'desc'),
        ];

        $records = $this->storageEngine->getAllForExport($entity, $params);
        $fields = $entity->fields->where('list_visible', true)->sortBy('order_index')->values();

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$entity->slug}_export_".date('Ymd_His').".csv\"",
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ];

        return response()->stream(function () use ($records, $fields) {
            $handle = fopen('php://output', 'w');

            // Write UTF-8 BOM for Excel compatibility
            fprintf($handle, chr(0xEF).chr(0xBB).chr(0xBF));

            // Write headers (Field Labels)
            $headerRow = array_map(fn ($f) => $f->label, $fields->all());
            fputcsv($handle, $headerRow);

            // Write rows
            foreach ($records as $row) {
                $dataRow = [];
                foreach ($fields as $field) {
                    $val = $row[$field->key] ?? '';
                    if (is_array($val)) {
                        $dataRow[] = implode('|', $val);
                    } elseif (is_bool($val)) {
                        $dataRow[] = $val ? 'true' : 'false';
                    } else {
                        $dataRow[] = (string) $val;
                    }
                }
                fputcsv($handle, $dataRow);
            }

            fclose($handle);
        }, 200, $headers);
    }

    /**
     * Download empty CSV template containing form headers only.
     */
    private function downloadTemplate(DynEntity $entity): StreamedResponse
    {
        $fields = $entity->fields->where('form_visible', true)->sortBy('order_index')->values();

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$entity->slug}_template.csv\"",
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ];

        return response()->stream(function () use ($fields) {
            $handle = fopen('php://output', 'w');

            // UTF-8 BOM
            fprintf($handle, chr(0xEF).chr(0xBB).chr(0xBF));

            // Form field labels as headers (no PK, no data)
            $headerRow = array_map(fn ($f) => $f->key, $fields->all());
            fputcsv($handle, $headerRow);

            fclose($handle);
        }, 200, $headers);
    }

    private function resolveEntity(string $slug): ?DynEntity
    {
        return $this->metadataService->getEntityBySlug($slug);
    }

    private function guardEntityAccess(?DynEntity $entity, ?string $feature = null): ?JsonResponse
    {
        if (! $entity) {
            return response()->json([
                'success' => false,
                'message' => 'Entitas dinamis tidak ditemukan.',
                'data' => null,
            ], 404);
        }

        if (! $entity->is_active) {
            return response()->json([
                'success' => false,
                'message' => 'Entitas dinamis ini sedang dinonaktifkan.',
                'data' => null,
            ], 403);
        }

        if ($feature !== null && ! $entity->hasFeature($feature)) {
            return response()->json([
                'success' => false,
                'message' => "Fitur '{$feature}' dinonaktifkan pada entitas ini.",
                'data' => null,
            ], 403);
        }

        return null;
    }

    private function handleException(Throwable $e): JsonResponse
    {
        $status = $e->getCode();
        if (! is_int($status) || $status < 400 || $status > 599) {
            $status = 500;
        }

        return response()->json([
            'success' => false,
            'message' => $e->getMessage(),
            'error_code' => $e->getCode() ?: 'STORAGE_ERROR',
            'data' => null,
        ], $status);
    }
}
