<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Concerns\RespondsWithApi;
use App\Http\Controllers\Controller;
use App\Models\DynEntity;
use App\Models\DynField;
use App\Models\DynRecord;
use App\Models\DynUniqueValue;
use App\Services\DynamicSchema\DatabaseIntrospector;
use App\Services\DynamicSchema\MetadataService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use InvalidArgumentException;
use Throwable;

class DynamicSchemaController extends Controller
{
    use RespondsWithApi;

    public function __construct(
        protected MetadataService $metadataService,
        protected DatabaseIntrospector $introspector
    ) {}

    /**
     * List all entities with fields.
     */
    public function index(): JsonResponse
    {
        try {
            $entities = $this->metadataService->getAllEntities();

            return $this->success($entities, 'Daftar skema entitas dinamis dimuat.');
        } catch (Throwable $e) {
            return $this->handleException($e);
        }
    }

    /**
     * Create a new entity (Mode A document or Mode B bound).
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'slug' => ['required', 'string', 'max:50', 'regex:/^[a-z][a-z0-9_-]{0,48}$/', 'unique:dyn_entities,slug'],
            'label' => ['required', 'string', 'max:100'],
            'label_plural' => ['required', 'string', 'max:100'],
            'icon' => ['nullable', 'string', 'max:50', 'regex:/^[a-zA-Z0-9_-]+$/'],
            'description' => ['nullable', 'string'],
            'is_active' => ['boolean'],
            'features' => ['nullable', 'array'],
            'menu_order' => ['nullable', 'integer'],
            'source_schema' => ['nullable', 'string'],
            'source_table' => ['nullable', 'string'],
            'source_pk' => ['nullable', 'string'],
            'initial_fields' => ['nullable', 'array'],
        ]);

        try {
            return DB::transaction(function () use ($validated) {
                $isBound = ! empty($validated['source_table']);

                if ($isBound) {
                    $schema = $this->introspector->validateSchema($validated['source_schema'] ?: 'public');
                    $table = $this->introspector->validateTable($schema, $validated['source_table']);
                    $colInfo = $this->introspector->getColumns($schema, $table);

                    $validated['source_schema'] = $schema;
                    $validated['source_table'] = $table;
                    $validated['source_pk'] = $colInfo['primary_key'] ?: ($validated['source_pk'] ?? 'id');
                }

                $features = $validated['features'] ?? ['create', 'edit', 'delete', 'search', 'filter', 'export', 'import'];

                $entity = DynEntity::create([
                    'slug' => $validated['slug'],
                    'label' => $validated['label'],
                    'label_plural' => $validated['label_plural'],
                    'icon' => $validated['icon'] ?? 'layout-grid',
                    'description' => $validated['description'] ?? null,
                    'is_active' => $validated['is_active'] ?? true,
                    'features' => $features,
                    'menu_order' => $validated['menu_order'] ?? 100,
                    'source_schema' => $validated['source_schema'] ?? null,
                    'source_table' => $validated['source_table'] ?? null,
                    'source_pk' => $validated['source_pk'] ?? null,
                ]);

                // Create initial fields if provided
                if (! empty($validated['initial_fields'])) {
                    foreach ($validated['initial_fields'] as $index => $fieldData) {
                        if (empty($fieldData['key']) || empty($fieldData['label']) || empty($fieldData['type'])) {
                            continue;
                        }

                        DynField::create([
                            'entity_id' => $entity->id,
                            'key' => Str::slug($fieldData['key'], '_'),
                            'label' => $fieldData['label'],
                            'type' => $fieldData['type'],
                            'is_required' => (bool) ($fieldData['is_required'] ?? false),
                            'is_unique' => (bool) ($fieldData['is_unique'] ?? false),
                            'default_value' => $fieldData['default_value'] ?? null,
                            'options' => $fieldData['options'] ?? [],
                            'order_index' => $fieldData['order_index'] ?? $index,
                            'list_visible' => $fieldData['list_visible'] ?? true,
                            'form_visible' => $fieldData['form_visible'] ?? true,
                            'placeholder' => $fieldData['placeholder'] ?? null,
                            'help_text' => $fieldData['help_text'] ?? null,
                        ]);
                    }
                }

                $this->metadataService->clearCache();

                $fresh = $entity->load(['fields' => fn ($q) => $q->orderBy('order_index')]);

                return $this->success($fresh, 'Entitas berhasil dibuat.', 201);
            });
        } catch (Throwable $e) {
            return $this->handleException($e);
        }
    }

    /**
     * Show single entity metadata.
     */
    public function show(string $slug): JsonResponse
    {
        try {
            $entity = $this->metadataService->getEntityBySlug($slug);
            if (! $entity) {
                return $this->error("Entitas '{$slug}' tidak ditemukan.", 404);
            }

            return $this->success($entity, 'Entitas dimuat.');
        } catch (Throwable $e) {
            return $this->handleException($e);
        }
    }

    /**
     * Update entity metadata.
     */
    public function update(Request $request, string $slug): JsonResponse
    {
        $entity = DynEntity::where('slug', $slug)->first();
        if (! $entity) {
            return $this->error("Entitas '{$slug}' tidak ditemukan.", 404);
        }

        $validated = $request->validate([
            'label' => ['sometimes', 'required', 'string', 'max:100'],
            'label_plural' => ['sometimes', 'required', 'string', 'max:100'],
            'icon' => ['nullable', 'string', 'max:50', 'regex:/^[a-zA-Z0-9_-]+$/'],
            'description' => ['nullable', 'string'],
            'is_active' => ['sometimes', 'boolean'],
            'features' => ['sometimes', 'array'],
            'menu_order' => ['sometimes', 'integer'],
        ]);

        try {
            $entity->update($validated);
            $this->metadataService->clearCache();

            return $this->success($entity->fresh('fields'), 'Entitas berhasil diperbarui.');
        } catch (Throwable $e) {
            return $this->handleException($e);
        }
    }

    /**
     * Delete entity.
     */
    public function destroy(string $slug): JsonResponse
    {
        $entity = DynEntity::where('slug', $slug)->first();
        if (! $entity) {
            return $this->error("Entitas '{$slug}' tidak ditemukan.", 404);
        }

        try {
            // Delete entity (cascade deletes dyn_fields, dyn_records, dyn_unique_values).
            // For Mode B, this leaves the original table completely intact.
            $entity->delete();
            $this->metadataService->clearCache();

            return $this->deleted('Entitas berhasil dihapus.');
        } catch (Throwable $e) {
            return $this->handleException($e);
        }
    }

    /**
     * Add a new field to entity.
     */
    public function storeField(Request $request, string $slug): JsonResponse
    {
        $entity = DynEntity::where('slug', $slug)->first();
        if (! $entity) {
            return $this->error("Entitas '{$slug}' tidak ditemukan.", 404);
        }

        $validated = $request->validate([
            'key' => ['required', 'string', 'max:50', 'regex:/^[a-z][a-z0-9_]{0,48}$/'],
            'label' => ['required', 'string', 'max:100'],
            'type' => ['required', 'string', 'in:text,textarea,richtext,number,boolean,date,datetime,email,url,select,multiselect,file,relation,relation_many'],
            'is_required' => ['boolean'],
            'is_unique' => ['boolean'],
            'default_value' => ['nullable', 'string'],
            'options' => ['nullable', 'array'],
            'order_index' => ['nullable', 'integer'],
            'list_visible' => ['boolean'],
            'form_visible' => ['boolean'],
            'placeholder' => ['nullable', 'string'],
            'help_text' => ['nullable', 'string'],
        ]);

        if ($entity->fields()->where('key', $validated['key'])->exists()) {
            return $this->error("Field dengan kunci '{$validated['key']}' sudah ada pada entitas ini.", 409);
        }

        try {
            $field = $entity->fields()->create($validated);
            $this->metadataService->clearCache();

            return $this->success($field, 'Field berhasil ditambahkan.', 201);
        } catch (Throwable $e) {
            return $this->handleException($e);
        }
    }

    /**
     * Update an existing field.
     */
    public function updateField(Request $request, string $slug, int $id): JsonResponse
    {
        $entity = DynEntity::where('slug', $slug)->first();
        if (! $entity) {
            return $this->error("Entitas '{$slug}' tidak ditemukan.", 404);
        }

        $field = $entity->fields()->where('id', $id)->first();
        if (! $field) {
            return $this->error("Field tidak ditemukan.", 404);
        }

        // Prevent modification of `key` and `type`
        if ($request->has('key') && $request->input('key') !== $field->key) {
            return $this->error('Kunci field (key) tidak dapat diubah setelah dibuat karena akan merusak integritas data yang sudah tersimpan.', 400);
        }
        if ($request->has('type') && $request->input('type') !== $field->type) {
            return $this->error('Tipe field (type) tidak dapat diubah setelah dibuat karena akan merusak integritas data yang sudah tersimpan.', 400);
        }

        $validated = $request->validate([
            'label' => ['sometimes', 'required', 'string', 'max:100'],
            'is_required' => ['sometimes', 'boolean'],
            'is_unique' => ['sometimes', 'boolean'],
            'default_value' => ['nullable', 'string'],
            'options' => ['nullable', 'array'],
            'order_index' => ['sometimes', 'integer'],
            'list_visible' => ['sometimes', 'boolean'],
            'form_visible' => ['sometimes', 'boolean'],
            'placeholder' => ['nullable', 'string'],
            'help_text' => ['nullable', 'string'],
        ]);

        try {
            $field->update($validated);
            $this->metadataService->clearCache();

            return $this->success($field->fresh(), 'Field berhasil diperbarui.');
        } catch (Throwable $e) {
            return $this->handleException($e);
        }
    }

    /**
     * Delete field and clean its values from records.
     */
    public function destroyField(string $slug, int $id): JsonResponse
    {
        $entity = DynEntity::where('slug', $slug)->first();
        if (! $entity) {
            return $this->error("Entitas '{$slug}' tidak ditemukan.", 404);
        }

        $field = $entity->fields()->where('id', $id)->first();
        if (! $field) {
            return $this->error("Field tidak ditemukan.", 404);
        }

        try {
            DB::transaction(function () use ($entity, $field) {
                // Delete unique values for this field
                DynUniqueValue::where('entity_id', $entity->id)
                    ->where('field_key', $field->key)
                    ->delete();

                // For document entities, remove field key from dyn_records
                if (! $entity->isBound()) {
                    if (DB::getDriverName() === 'pgsql') {
                        DB::statement("UPDATE dyn_records SET data = data - ? WHERE entity_id = ?", [$field->key, $entity->id]);
                    }
                }

                $field->delete();
            });

            $this->metadataService->clearCache();

            return $this->deleted('Field berhasil dihapus.');
        } catch (Throwable $e) {
            return $this->handleException($e);
        }
    }

    /**
     * Introspect database schemas.
     */
    public function introspectSchemas(): JsonResponse
    {
        try {
            $schemas = $this->introspector->getSchemas();

            return $this->success($schemas, 'Daftar schema database berhasil dimuat.');
        } catch (Throwable $e) {
            return $this->handleException($e);
        }
    }

    /**
     * Introspect tables in a schema.
     */
    public function introspectTables(string $schema): JsonResponse
    {
        try {
            $tables = $this->introspector->getTables($schema);

            return $this->success($tables, "Daftar tabel pada schema '{$schema}' berhasil dimuat.");
        } catch (Throwable $e) {
            return $this->handleException($e);
        }
    }

    /**
     * Introspect columns in a table.
     */
    public function introspectColumns(string $schema, string $table): JsonResponse
    {
        try {
            $columnInfo = $this->introspector->getColumns($schema, $table);

            return $this->success($columnInfo, "Informasi kolom untuk '{$schema}.{$table}' berhasil dimuat.");
        } catch (Throwable $e) {
            return $this->handleException($e);
        }
    }

    private function handleException(Throwable $e): JsonResponse
    {
        $status = $e->getCode();
        if (! is_int($status) || $status < 400 || $status > 599) {
            $status = ($e instanceof InvalidArgumentException) ? 400 : 500;
        }

        return response()->json([
            'success' => false,
            'message' => $e->getMessage(),
            'error_code' => $e->getCode() ?: 'DATABASE_OR_INTERNAL_ERROR',
            'data' => null,
        ], $status);
    }
}
