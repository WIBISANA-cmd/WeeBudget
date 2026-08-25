<?php

namespace App\Services\DynamicSchema;

use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class DatabaseIntrospector
{
    private const FORBIDDEN_SCHEMAS = [
        'pg_catalog',
        'information_schema',
        'pg_toast',
        'pg_temp',
        'pg_toast_temp',
    ];

    /**
     * Get accessible schemas from the database.
     *
     * @return array<int, string>
     */
    public function getSchemas(): array
    {
        $driver = DB::getDriverName();

        if ($driver === 'pgsql') {
            $rows = DB::select("
                SELECT schema_name 
                FROM information_schema.schemata 
                WHERE schema_name NOT IN ('pg_catalog', 'information_schema') 
                  AND schema_name NOT LIKE 'pg_%'
                ORDER BY schema_name ASC
            ");

            return array_map(fn ($r) => $r->schema_name, $rows);
        }

        if ($driver === 'sqlite') {
            return ['main'];
        }

        $rows = DB::select("SELECT schema_name FROM information_schema.schemata ORDER BY schema_name ASC");
        return array_map(fn ($r) => $r->schema_name, $rows);
    }

    /**
     * Check if a schema name is allowed and exists.
     */
    public function validateSchema(string $schema): string
    {
        $normalized = strtolower(trim($schema));

        foreach (self::FORBIDDEN_SCHEMAS as $forbidden) {
            if ($normalized === $forbidden || str_starts_with($normalized, 'pg_')) {
                throw new InvalidArgumentException("Schema '{$schema}' merupakan schema sistem yang dilarang.");
            }
        }

        $available = $this->getSchemas();
        foreach ($available as $s) {
            if (strtolower($s) === $normalized) {
                return $s;
            }
        }

        throw new InvalidArgumentException("Schema '{$schema}' tidak ditemukan dalam katalog database.");
    }

    /**
     * Get tables for a validated schema.
     *
     * @return array<int, string>
     */
    public function getTables(string $schema): array
    {
        $validatedSchema = $this->validateSchema($schema);
        $driver = DB::getDriverName();

        if ($driver === 'pgsql') {
            $rows = DB::select("
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = ? 
                  AND table_type = 'BASE TABLE'
                ORDER BY table_name ASC
            ", [$validatedSchema]);

            return array_map(fn ($r) => $r->table_name, $rows);
        }

        if ($driver === 'sqlite') {
            $rows = DB::select("SELECT name as table_name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name");
            return array_map(fn ($r) => $r->table_name, $rows);
        }

        $rows = DB::select("
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = ? AND table_type = 'BASE TABLE'
            ORDER BY table_name ASC
        ", [$validatedSchema]);

        return array_map(fn ($r) => $r->table_name, $rows);
    }

    /**
     * Validate table exists in catalog and return the exact canonical catalog name.
     */
    public function validateTable(string $schema, string $table): string
    {
        $validatedSchema = $this->validateSchema($schema);
        $normalizedTable = strtolower(trim($table));

        $tables = $this->getTables($validatedSchema);
        foreach ($tables as $t) {
            if (strtolower($t) === $normalizedTable) {
                return $t;
            }
        }

        throw new InvalidArgumentException("Tabel '{$table}' tidak ditemukan di schema '{$validatedSchema}'.");
    }

    /**
     * Get columns, data types, and primary key for a validated table.
     *
     * @return array{
     *     columns: array<int, array{name: string, type: string, inferred_type: string, is_nullable: bool, default: mixed, is_pk: bool}>,
     *     primary_key: ?string,
     *     has_single_pk: bool
     * }
     */
    public function getColumns(string $schema, string $table): array
    {
        $validatedSchema = $this->validateSchema($schema);
        $validatedTable = $this->validateTable($validatedSchema, $table);
        $driver = DB::getDriverName();

        if ($driver === 'pgsql') {
            $pkRows = DB::select("
                SELECT kcu.column_name
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu
                  ON tc.constraint_name = kcu.constraint_name
                  AND tc.table_schema = kcu.table_schema
                WHERE tc.constraint_type = 'PRIMARY KEY'
                  AND tc.table_schema = ?
                  AND tc.table_name = ?
                ORDER BY kcu.ordinal_position
            ", [$validatedSchema, $validatedTable]);

            $pkColumns = array_map(fn ($r) => $r->column_name, $pkRows);
            $singlePk = count($pkColumns) === 1 ? $pkColumns[0] : null;

            $colRows = DB::select("
                SELECT column_name, data_type, is_nullable, column_default, udt_name
                FROM information_schema.columns
                WHERE table_schema = ? AND table_name = ?
                ORDER BY ordinal_position ASC
            ", [$validatedSchema, $validatedTable]);

            $columns = array_map(function ($col) use ($pkColumns) {
                $isPk = in_array($col->column_name, $pkColumns, true);
                $inferredType = $this->inferFieldType($col->data_type, $col->udt_name, $col->column_name);

                return [
                    'name' => $col->column_name,
                    'type' => $col->data_type,
                    'inferred_type' => $inferredType,
                    'is_nullable' => $col->is_nullable === 'YES',
                    'default' => $col->column_default,
                    'is_pk' => $isPk,
                ];
            }, $colRows);

            return [
                'columns' => $columns,
                'primary_key' => $singlePk,
                'primary_keys' => $pkColumns,
                'has_single_pk' => count($pkColumns) === 1,
            ];
        }

        if ($driver === 'sqlite') {
            $colRows = DB::select("PRAGMA table_info(\"{$validatedTable}\")");
            $pkColumns = [];
            foreach ($colRows as $col) {
                if ($col->pk) {
                    $pkColumns[] = $col->name;
                }
            }

            $columns = array_map(function ($col) {
                $inferredType = $this->inferFieldType($col->type, $col->type, $col->name);

                return [
                    'name' => $col->name,
                    'type' => $col->type,
                    'inferred_type' => $inferredType,
                    'is_nullable' => ! $col->notnull,
                    'default' => $col->dflt_value,
                    'is_pk' => (bool) $col->pk,
                ];
            }, $colRows);

            return [
                'columns' => $columns,
                'primary_key' => count($pkColumns) === 1 ? $pkColumns[0] : null,
                'primary_keys' => $pkColumns,
                'has_single_pk' => count($pkColumns) === 1,
            ];
        }

        return [
            'columns' => [],
            'primary_key' => null,
            'primary_keys' => [],
            'has_single_pk' => false,
        ];
    }

    /**
     * Map database column data type to one of the 14 dynamic schema field types.
     */
    public function inferFieldType(string $dataType, string $udtName = '', string $columnName = ''): string
    {
        $dataType = strtolower($dataType);
        $udtName = strtolower($udtName);
        $columnName = strtolower($columnName);

        if (str_contains($columnName, 'email')) {
            return 'email';
        }
        if (str_contains($columnName, 'url') || str_contains($columnName, 'link') || str_contains($columnName, 'website')) {
            return 'url';
        }

        if (in_array($dataType, ['boolean', 'bool'])) {
            return 'boolean';
        }

        if (in_array($dataType, ['integer', 'bigint', 'smallint', 'numeric', 'decimal', 'real', 'double precision', 'float', 'int', 'int4', 'int8', 'int2'])) {
            return 'number';
        }

        if (in_array($dataType, ['date'])) {
            return 'date';
        }

        if (in_array($dataType, ['timestamp without time zone', 'timestamp with time zone', 'timestamp', 'timestamptz', 'datetime'])) {
            return 'datetime';
        }

        if (in_array($dataType, ['text', 'longtext', 'mediumtext'])) {
            return 'textarea';
        }

        return 'text';
    }
}
