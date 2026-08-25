<?php

namespace App\Services\DynamicSchema;

use App\Models\DynEntity;
use App\Models\DynField;
use App\Models\DynRecord;
use App\Models\DynUniqueValue;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;
use RuntimeException;

class DynamicStorageEngine
{
    public function __construct(
        protected DatabaseIntrospector $introspector
    ) {}

    /**
     * Get paginated records for an entity.
     *
     * @param  DynEntity  $entity
     * @param  array{
     *     search?: ?string,
     *     filters?: array<string, mixed>,
     *     sort?: ?string,
     *     dir?: ?string,
     *     page?: int,
     *     pageSize?: int
     * }  $params
     * @return array{items: array<int, array<string, mixed>>, total: int, page: int, pageSize: int, lastPage: int}
     */
    public function paginate(DynEntity $entity, array $params = []): array
    {
        $search = $params['search'] ?? null;
        $filters = $params['filters'] ?? [];
        $sortKey = $params['sort'] ?? null;
        $sortDir = strtolower($params['dir'] ?? 'desc') === 'asc' ? 'asc' : 'desc';
        $page = max(1, (int) ($params['page'] ?? 1));
        $pageSize = max(1, min(100, (int) ($params['pageSize'] ?? 20)));

        if ($entity->isBound()) {
            return $this->paginateBound($entity, $search, $filters, $sortKey, $sortDir, $page, $pageSize);
        }

        return $this->paginateDocument($entity, $search, $filters, $sortKey, $sortDir, $page, $pageSize);
    }

    /**
     * Get all records for export (matching active filters and search).
     *
     * @return array<int, array<string, mixed>>
     */
    public function getAllForExport(DynEntity $entity, array $params = []): array
    {
        $search = $params['search'] ?? null;
        $filters = $params['filters'] ?? [];
        $sortKey = $params['sort'] ?? null;
        $sortDir = strtolower($params['dir'] ?? 'desc') === 'asc' ? 'asc' : 'desc';

        if ($entity->isBound()) {
            $result = $this->paginateBound($entity, $search, $filters, $sortKey, $sortDir, 1, 10000);
            return $result['items'];
        }

        $result = $this->paginateDocument($entity, $search, $filters, $sortKey, $sortDir, 1, 10000);
        return $result['items'];
    }

    /**
     * Find a single record by ID.
     *
     * @return array<string, mixed>
     */
    public function find(DynEntity $entity, int|string $id): array
    {
        if ($entity->isBound()) {
            return $this->findBound($entity, $id);
        }

        return $this->findDocument($entity, $id);
    }

    /**
     * Create a new record.
     *
     * @param  DynEntity  $entity
     * @param  array<string, mixed>  $validatedData
     * @param  User|null  $user
     * @return array<string, mixed>
     */
    public function create(DynEntity $entity, array $validatedData, ?User $user = null): array
    {
        if ($entity->isBound()) {
            return $this->createBound($entity, $validatedData);
        }

        return $this->createDocument($entity, $validatedData, $user);
    }

    /**
     * Update an existing record (partial merge).
     *
     * @param  DynEntity  $entity
     * @param  int|string  $id
     * @param  array<string, mixed>  $validatedData
     * @return array<string, mixed>
     */
    public function update(DynEntity $entity, int|string $id, array $validatedData): array
    {
        if ($entity->isBound()) {
            return $this->updateBound($entity, $id, $validatedData);
        }

        return $this->updateDocument($entity, $id, $validatedData);
    }

    /**
     * Delete a record.
     */
    public function delete(DynEntity $entity, int|string $id): void
    {
        if ($entity->isBound()) {
            $this->deleteBound($entity, $id);
            return;
        }

        $this->deleteDocument($entity, $id);
    }

    /* ------------------------------------------------------------------ */
    /*  MODE A — DOCUMENT STORAGE (dyn_records + dyn_unique_values)        */
    /* ------------------------------------------------------------------ */

    private function paginateDocument(
        DynEntity $entity,
        ?string $search,
        array $filters,
        ?string $sortKey,
        string $sortDir,
        int $page,
        int $pageSize
    ): array {
        $query = DynRecord::query()->where('entity_id', $entity->id);
        $fields = $entity->fields->keyBy('key');

        // Apply search if feature enabled
        if ($search !== null && $search !== '' && $entity->hasFeature('search')) {
            $query->where(function ($inner) use ($fields, $search) {
                $driver = DB::getDriverName();
                $likeOp = $driver === 'pgsql' ? 'ILIKE' : 'LIKE';
                $term = "%{$search}%";

                $hasSearchCondition = false;
                foreach ($fields as $field) {
                    if (in_array($field->type, ['text', 'textarea', 'email', 'url', 'richtext', 'select'], true)) {
                        if ($driver === 'pgsql') {
                            $inner->orWhereRaw("data->>? {$likeOp} ?", [$field->key, $term]);
                        } else {
                            $inner->orWhereRaw("json_extract(data, '$.\"{$field->key}\"') {$likeOp} ?", [$term]);
                        }
                        $hasSearchCondition = true;
                    }
                }

                if (! $hasSearchCondition) {
                    $inner->whereRaw('1 = 0');
                }
            });
        }

        // Apply filters if feature enabled
        if ($entity->hasFeature('filter') && ! empty($filters)) {
            $driver = DB::getDriverName();
            foreach ($filters as $key => $val) {
                if ($val === null || $val === '' || ! $fields->has($key)) {
                    continue;
                }

                $field = $fields[$key];
                if ($field->type === 'boolean') {
                    $boolVal = filter_var($val, FILTER_VALIDATE_BOOLEAN) ? 'true' : 'false';
                    if ($driver === 'pgsql') {
                        $query->whereRaw("data->>? = ?", [$key, $boolVal]);
                    } else {
                        $query->whereRaw("json_extract(data, '$.\"{$key}\"') = ?", [$boolVal === 'true' ? 1 : 0]);
                    }
                } elseif ($field->type === 'number') {
                    if ($driver === 'pgsql') {
                        $query->whereRaw("(data->>?)::numeric = ?", [$key, (float) $val]);
                    } else {
                        $query->whereRaw("CAST(json_extract(data, '$.\"{$key}\"') AS NUMERIC) = ?", [(float) $val]);
                    }
                } else {
                    if ($driver === 'pgsql') {
                        $query->whereRaw("data->>? = ?", [$key, (string) $val]);
                    } else {
                        $query->whereRaw("json_extract(data, '$.\"{$key}\"') = ?", [(string) $val]);
                    }
                }
            }
        }

        // Apply sorting
        if ($sortKey && $fields->has($sortKey)) {
            $field = $fields[$sortKey];
            $driver = DB::getDriverName();
            if ($field->type === 'number') {
                if ($driver === 'pgsql') {
                    $query->orderByRaw("(data->>?)::numeric {$sortDir} NULLS LAST", [$sortKey]);
                } else {
                    $query->orderByRaw("CAST(json_extract(data, '$.\"{$sortKey}\"') AS NUMERIC) {$sortDir}");
                }
            } else {
                if ($driver === 'pgsql') {
                    $query->orderByRaw("data->>? {$sortDir} NULLS LAST", [$sortKey]);
                } else {
                    $query->orderByRaw("json_extract(data, '$.\"{$sortKey}\"') {$sortDir}");
                }
            }
        } else {
            $query->orderBy('created_at', 'desc')->orderBy('id', 'desc');
        }

        $total = $query->count();
        $records = $query->skip(($page - 1) * $pageSize)->take($pageSize)->get();

        $items = $records->map(fn ($r) => $this->formatDocumentRecord($r, $fields))->all();
        $lastPage = (int) max(1, ceil($total / $pageSize));

        return [
            'items' => $items,
            'total' => $total,
            'page' => $page,
            'pageSize' => $pageSize,
            'lastPage' => $lastPage,
        ];
    }

    private function findDocument(DynEntity $entity, int|string $id): array
    {
        $record = DynRecord::where('entity_id', $entity->id)->where('id', $id)->first();
        if (! $record) {
            throw new RuntimeException("Data dengan ID {$id} tidak ditemukan.", 404);
        }

        $fields = $entity->fields->keyBy('key');
        return $this->formatDocumentRecord($record, $fields);
    }

    private function createDocument(DynEntity $entity, array $validatedData, ?User $user = null): array
    {
        return DB::transaction(function () use ($entity, $validatedData, $user) {
            // 1. Create dyn_record with JSON document
            $record = DynRecord::create([
                'entity_id' => $entity->id,
                'data' => $validatedData,
                'created_by' => $user?->id,
            ]);

            // 2. Enforce uniqueness slot-by-slot via dyn_unique_values
            $uniqueFields = $entity->fields->where('is_unique', true);
            foreach ($uniqueFields as $uf) {
                $val = $validatedData[$uf->key] ?? null;
                if ($val !== null && $val !== '') {
                    $strVal = is_array($val) ? json_encode($val) : (string) $val;
                    try {
                        DynUniqueValue::create([
                            'entity_id' => $entity->id,
                            'record_id' => $record->id,
                            'field_key' => $uf->key,
                            'value' => $strVal,
                        ]);
                    } catch (QueryException $e) {
                        if ($this->isUniqueViolation($e)) {
                            throw new RuntimeException("Nilai '{$strVal}' pada field '{$uf->label}' sudah digunakan.", 409);
                        }
                        throw $e;
                    }
                }
            }

            return $this->findDocument($entity, $record->id);
        });
    }

    private function updateDocument(DynEntity $entity, int|string $id, array $validatedData): array
    {
        return DB::transaction(function () use ($entity, $id, $validatedData) {
            $record = DynRecord::where('entity_id', $entity->id)->where('id', $id)->lockForUpdate()->first();
            if (! $record) {
                throw new RuntimeException("Data dengan ID {$id} tidak ditemukan.", 404);
            }

            // Merge data
            $currentData = $record->data ?? [];
            $mergedData = array_merge($currentData, $validatedData);

            // If a field key is explicitly null in validatedData, remove or set null
            foreach ($validatedData as $k => $v) {
                if ($v === null) {
                    unset($mergedData[$k]);
                } else {
                    $mergedData[$k] = $v;
                }
            }

            $record->data = $mergedData;
            $record->save();

            // Refresh unique values for updated unique fields
            $uniqueFields = $entity->fields->where('is_unique', true);
            foreach ($uniqueFields as $uf) {
                if (array_key_exists($uf->key, $validatedData)) {
                    DynUniqueValue::where('record_id', $record->id)
                        ->where('field_key', $uf->key)
                        ->delete();

                    $newVal = $mergedData[$uf->key] ?? null;
                    if ($newVal !== null && $newVal !== '') {
                        $strVal = is_array($newVal) ? json_encode($newVal) : (string) $newVal;
                        try {
                            DynUniqueValue::create([
                                'entity_id' => $entity->id,
                                'record_id' => $record->id,
                                'field_key' => $uf->key,
                                'value' => $strVal,
                            ]);
                        } catch (QueryException $e) {
                            if ($this->isUniqueViolation($e)) {
                                throw new RuntimeException("Nilai '{$strVal}' pada field '{$uf->label}' sudah digunakan.", 409);
                            }
                            throw $e;
                        }
                    }
                }
            }

            return $this->findDocument($entity, $record->id);
        });
    }

    private function deleteDocument(DynEntity $entity, int|string $id): void
    {
        DB::transaction(function () use ($entity, $id) {
            $record = DynRecord::where('entity_id', $entity->id)->where('id', $id)->first();
            if (! $record) {
                throw new RuntimeException("Data dengan ID {$id} tidak ditemukan.", 404);
            }

            // Check if referenced by other relation fields
            $this->ensureNotReferenced($entity, $id);

            // Delete record (cascades dyn_unique_values)
            $record->delete();
        });
    }

    /**
     * Check if a document record is referenced by other dynamic entities.
     */
    private function ensureNotReferenced(DynEntity $entity, int|string $id): void
    {
        $allEntities = DynEntity::with('fields')->get();

        foreach ($allEntities as $otherEntity) {
            foreach ($otherEntity->fields as $field) {
                $options = is_array($field->options) ? $field->options : [];
                $relTarget = $options['relation']['entity'] ?? null;

                if ($relTarget === $entity->slug) {
                    $driver = DB::getDriverName();
                    if ($field->type === 'relation') {
                        if ($driver === 'pgsql') {
                            $isUsed = DynRecord::where('entity_id', $otherEntity->id)
                                ->whereRaw("data->>? = ?", [$field->key, (string) $id])
                                ->exists();
                        } else {
                            $isUsed = DynRecord::where('entity_id', $otherEntity->id)
                                ->whereRaw("CAST(json_extract(data, '$.\"{$field->key}\"') AS TEXT) = ?", [(string) $id])
                                ->exists();
                        }
                        if ($isUsed) {
                            throw new RuntimeException("Data ini tidak dapat dihapus karena masih direferensikan oleh entitas '{$otherEntity->label}'.", 409);
                        }
                    } elseif ($field->type === 'relation_many') {
                        if ($driver === 'pgsql') {
                            $isUsed = DynRecord::where('entity_id', $otherEntity->id)
                                ->whereRaw("data->? @> ?", [$field->key, json_encode([(int) $id])])
                                ->exists();
                        } else {
                            $isUsed = DynRecord::where('entity_id', $otherEntity->id)
                                ->whereRaw("json_extract(data, '$.\"{$field->key}\"') LIKE ?", ['%'.(string) $id.'%'])
                                ->exists();
                        }
                        if ($isUsed) {
                            throw new RuntimeException("Data ini tidak dapat dihapus karena masih direferensikan oleh entitas '{$otherEntity->label}'.", 409);
                        }
                    }
                }
            }
        }
    }

    private function formatDocumentRecord(DynRecord $record, $fields): array
    {
        $data = $record->data ?? [];
        $result = [
            'id' => $record->id,
            'created_at' => $record->created_at?->toISOString(),
            'updated_at' => $record->updated_at?->toISOString(),
        ];

        foreach ($fields as $field) {
            $result[$field->key] = $data[$field->key] ?? null;
        }

        return $result;
    }

    /* ------------------------------------------------------------------ */
    /*  MODE B — BOUND TABLE ENGINE (Direct Table CRUD)                   */
    /* ------------------------------------------------------------------ */

    private function getBoundTableInfo(DynEntity $entity): array
    {
        $schema = $this->introspector->validateSchema($entity->source_schema ?: 'public');
        $table = $this->introspector->validateTable($schema, $entity->source_table);
        $colInfo = $this->introspector->getColumns($schema, $table);

        $pk = $entity->source_pk ?: $colInfo['primary_key'];
        if (! $pk) {
            $pk = 'id';
        }

        $tableName = $schema ? "{$schema}.{$table}" : $table;

        // Build list of columns to select from entity fields + PK
        $fieldKeys = $entity->fields->pluck('key')->all();
        $catalogColumnNames = array_map(fn ($c) => $c['name'], $colInfo['columns']);

        // Only select columns confirmed by catalog
        $selectedColumns = array_values(array_intersect($fieldKeys, $catalogColumnNames));
        if (! in_array($pk, $selectedColumns, true) && in_array($pk, $catalogColumnNames, true)) {
            $selectedColumns[] = $pk;
        }

        // If no fields defined yet, select all catalog columns
        if (empty($selectedColumns)) {
            $selectedColumns = $catalogColumnNames;
        }

        return [
            'schema' => $schema,
            'table' => $table,
            'tableName' => $tableName,
            'pk' => $pk,
            'hasSinglePk' => $colInfo['has_single_pk'],
            'columns' => $selectedColumns,
            'catalogColumns' => $catalogColumnNames,
        ];
    }

    private function paginateBound(
        DynEntity $entity,
        ?string $search,
        array $filters,
        ?string $sortKey,
        string $sortDir,
        int $page,
        int $pageSize
    ): array {
        $info = $this->getBoundTableInfo($entity);
        $query = DB::table($info['tableName'])->select($info['columns']);
        $fields = $entity->fields->keyBy('key');

        // Apply search
        if ($search !== null && $search !== '' && $entity->hasFeature('search')) {
            $query->where(function ($inner) use ($info, $fields, $search) {
                $driver = DB::getDriverName();
                $likeOp = $driver === 'pgsql' ? 'ILIKE' : 'LIKE';
                $term = "%{$search}%";

                $hasSearchCondition = false;
                foreach ($info['columns'] as $col) {
                    $field = $fields[$col] ?? null;
                    if (! $field || in_array($field->type, ['text', 'textarea', 'email', 'url', 'richtext', 'select'], true)) {
                        $inner->orWhere($col, $likeOp, $term);
                        $hasSearchCondition = true;
                    }
                }

                if (! $hasSearchCondition) {
                    $inner->whereRaw('1 = 0');
                }
            });
        }

        // Apply filters
        if ($entity->hasFeature('filter') && ! empty($filters)) {
            foreach ($filters as $key => $val) {
                if ($val === null || $val === '' || ! in_array($key, $info['columns'], true)) {
                    continue;
                }
                $query->where($key, $val);
            }
        }

        // Apply sorting
        if ($sortKey && in_array($sortKey, $info['columns'], true)) {
            $query->orderBy($sortKey, $sortDir);
        } elseif (in_array($info['pk'], $info['columns'], true)) {
            $query->orderBy($info['pk'], 'desc');
        }

        $total = $query->count();
        $rows = $query->skip(($page - 1) * $pageSize)->take($pageSize)->get();

        $items = array_map(function ($row) use ($info) {
            $arr = (array) $row;
            if (! isset($arr['id']) && isset($arr[$info['pk']])) {
                $arr['id'] = $arr[$info['pk']];
            }
            return $arr;
        }, $rows->all());

        $lastPage = (int) max(1, ceil($total / $pageSize));

        return [
            'items' => $items,
            'total' => $total,
            'page' => $page,
            'pageSize' => $pageSize,
            'lastPage' => $lastPage,
        ];
    }

    private function findBound(DynEntity $entity, int|string $id): array
    {
        $info = $this->getBoundTableInfo($entity);
        $row = DB::table($info['tableName'])
            ->select($info['columns'])
            ->where($info['pk'], $id)
            ->first();

        if (! $row) {
            throw new RuntimeException("Data dengan ID {$id} tidak ditemukan pada tabel {$info['table']}.", 404);
        }

        $arr = (array) $row;
        if (! isset($arr['id']) && isset($arr[$info['pk']])) {
            $arr['id'] = $arr[$info['pk']];
        }

        return $arr;
    }

    private function createBound(DynEntity $entity, array $validatedData): array
    {
        $info = $this->getBoundTableInfo($entity);

        // Filter payload to only verified catalog columns
        $payload = [];
        foreach ($validatedData as $key => $val) {
            if (in_array($key, $info['catalogColumns'], true)) {
                $payload[$key] = $val;
            }
        }

        try {
            $insertId = DB::table($info['tableName'])->insertGetId($payload, $info['pk']);
            return $this->findBound($entity, $insertId);
        } catch (QueryException $e) {
            if ($this->isUniqueViolation($e)) {
                throw new RuntimeException("Data duplikat terdeteksi pada constraint database: ".$e->getMessage(), 409);
            }
            throw $e;
        }
    }

    private function updateBound(DynEntity $entity, int|string $id, array $validatedData): array
    {
        $info = $this->getBoundTableInfo($entity);
        if (! $info['hasSinglePk']) {
            throw new RuntimeException("Tabel '{$info['table']}' tidak memiliki primary key tunggal sehingga operasi update tidak diizinkan.", 400);
        }

        $payload = [];
        foreach ($validatedData as $key => $val) {
            if (in_array($key, $info['catalogColumns'], true) && $key !== $info['pk']) {
                $payload[$key] = $val;
            }
        }

        try {
            DB::table($info['tableName'])->where($info['pk'], $id)->update($payload);
            return $this->findBound($entity, $id);
        } catch (QueryException $e) {
            if ($this->isUniqueViolation($e)) {
                throw new RuntimeException("Data duplikat terdeteksi pada constraint database: ".$e->getMessage(), 409);
            }
            throw $e;
        }
    }

    private function deleteBound(DynEntity $entity, int|string $id): void
    {
        $info = $this->getBoundTableInfo($entity);
        if (! $info['hasSinglePk']) {
            throw new RuntimeException("Tabel '{$info['table']}' tidak memiliki primary key tunggal sehingga operasi delete tidak diizinkan.", 400);
        }

        DB::table($info['tableName'])->where($info['pk'], $id)->delete();
    }

    private function isUniqueViolation(QueryException $e): bool
    {
        $code = (string) $e->getCode();
        $msg = strtolower($e->getMessage());

        return $code === '23505' || str_contains($msg, 'unique') || str_contains($msg, 'duplicate');
    }
}
