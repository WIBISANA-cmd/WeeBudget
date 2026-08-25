<?php

namespace App\Services\DynamicSchema;

use App\Models\DynEntity;
use App\Models\DynField;
use App\Models\DynRecord;
use DateTimeImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;

class MetadataValidator
{
    /**
     * Normalize, validate, and sanitize a record payload against the entity's field definitions.
     *
     * @param  DynEntity  $entity
     * @param  array<string, mixed>  $rawPayload
     * @param  bool  $isUpdate
     * @param  int|string|null  $recordId
     * @return array<string, mixed>
     *
     * @throws ValidationException
     */
    public function validate(DynEntity $entity, array $rawPayload, bool $isUpdate = false, int|string|null $recordId = null): array
    {
        $fields = $entity->fields;
        $fieldsByKey = $fields->keyBy('key');
        $validatedData = [];
        $errors = [];

        // Normalize raw payload: only keep registered field keys
        foreach ($fields as $field) {
            $key = $field->key;

            if (! array_key_exists($key, $rawPayload)) {
                if (! $isUpdate && $field->is_required) {
                    $errors[$key][] = "Field '{$field->label}' wajib diisi.";
                }
                continue;
            }

            $rawVal = $rawPayload[$key];

            // Normalize empty string to null
            if (is_string($rawVal) && trim($rawVal) === '') {
                $rawVal = null;
            }

            // Required check
            if ($field->is_required && ($rawVal === null || $rawVal === '')) {
                $errors[$key][] = "Field '{$field->label}' wajib diisi.";
                continue;
            }

            if ($rawVal === null) {
                $validatedData[$key] = null;
                continue;
            }

            // Type-specific validation and sanitization
            try {
                $typedVal = $this->validateAndSanitizeField($field, $rawVal);
                $validatedData[$key] = $typedVal;
            } catch (InvalidArgumentException $e) {
                $errors[$key][] = $e->getMessage();
            }
        }

        if (! empty($errors)) {
            throw ValidationException::withMessages($errors);
        }

        return $validatedData;
    }

    /**
     * Validate and sanitize a single field value.
     */
    public function validateAndSanitizeField(DynField $field, mixed $value): mixed
    {
        $options = is_array($field->options) ? $field->options : [];
        $type = $field->type;

        switch ($type) {
            case 'text':
                if (! is_string($value) && ! is_numeric($value)) {
                    throw new InvalidArgumentException("Field '{$field->label}' harus berupa teks.");
                }
                $val = trim((string) $value);
                if (isset($options['min_length']) && mb_strlen($val) < (int) $options['min_length']) {
                    throw new InvalidArgumentException("Field '{$field->label}' minimal {$options['min_length']} karakter.");
                }
                if (isset($options['max_length']) && mb_strlen($val) > (int) $options['max_length']) {
                    throw new InvalidArgumentException("Field '{$field->label}' maksimal {$options['max_length']} karakter.");
                }
                if (! empty($options['pattern'])) {
                    if (! @preg_match('/'.$options['pattern'].'/', $val)) {
                        throw new InvalidArgumentException("Format '{$field->label}' tidak valid.");
                    }
                }
                return htmlspecialchars($val, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8', false);

            case 'textarea':
                if (! is_string($value) && ! is_numeric($value)) {
                    throw new InvalidArgumentException("Field '{$field->label}' harus berupa teks.");
                }
                $val = trim((string) $value);
                if (isset($options['max_length']) && mb_strlen($val) > (int) $options['max_length']) {
                    throw new InvalidArgumentException("Field '{$field->label}' maksimal {$options['max_length']} karakter.");
                }
                return $val;

            case 'richtext':
                if (! is_string($value)) {
                    throw new InvalidArgumentException("Field '{$field->label}' harus berupa HTML/teks.");
                }
                return HtmlSanitizer::sanitize((string) $value);

            case 'number':
                if (! is_numeric($value)) {
                    throw new InvalidArgumentException("Field '{$field->label}' harus berupa angka.");
                }
                $num = (float) $value;
                if (! is_finite($num)) {
                    throw new InvalidArgumentException("Field '{$field->label}' harus berupa angka terbatas.");
                }
                if (! empty($options['integer_only']) && floor($num) !== $num) {
                    throw new InvalidArgumentException("Field '{$field->label}' harus berupa bilangan bulat.");
                }
                if (isset($options['min']) && $num < (float) $options['min']) {
                    throw new InvalidArgumentException("Field '{$field->label}' minimal {$options['min']}.");
                }
                if (isset($options['max']) && $num > (float) $options['max']) {
                    throw new InvalidArgumentException("Field '{$field->label}' maksimal {$options['max']}.");
                }
                return ! empty($options['integer_only']) ? (int) $num : (floor($num) === $num ? (int) $num : $num);

            case 'boolean':
                if (is_bool($value)) {
                    return $value;
                }
                if (in_array($value, [1, '1', 'true', 'TRUE', 'yes'], true)) {
                    return true;
                }
                if (in_array($value, [0, '0', 'false', 'FALSE', 'no', ''], true)) {
                    return false;
                }
                throw new InvalidArgumentException("Field '{$field->label}' harus berupa boolean.");

            case 'date':
                $val = trim((string) $value);
                if (! preg_match('/^\d{4}-\d{2}-\d{2}$/', $val)) {
                    throw new InvalidArgumentException("Field '{$field->label}' harus berformat YYYY-MM-DD.");
                }
                [$year, $month, $day] = explode('-', $val);
                if (! checkdate((int) $month, (int) $day, (int) $year)) {
                    throw new InvalidArgumentException("Field '{$field->label}' bukan tanggal yang valid.");
                }
                return $val;

            case 'datetime':
                $val = trim((string) $value);
                $dt = DateTimeImmutable::createFromFormat('Y-m-d H:i:s', $val)
                    ?: DateTimeImmutable::createFromFormat('Y-m-d\TH:i:s', $val)
                    ?: DateTimeImmutable::createFromFormat('Y-m-d\TH:i', $val)
                    ?: DateTimeImmutable::createFromFormat(DATE_ATOM, $val);
                if (! $dt) {
                    try {
                        $dt = new DateTimeImmutable($val);
                    } catch (\Throwable) {
                        throw new InvalidArgumentException("Field '{$field->label}' harus berupa tanggal dan waktu yang valid.");
                    }
                }
                return $dt->format('Y-m-d H:i:s');

            case 'email':
                $val = strtolower(trim((string) $value));
                if (! filter_var($val, FILTER_VALIDATE_EMAIL)) {
                    throw new InvalidArgumentException("Field '{$field->label}' harus berformat email yang valid.");
                }
                return $val;

            case 'url':
                $val = trim((string) $value);
                if (! preg_match('/^https?:\/\//i', $val) || ! filter_var($val, FILTER_VALIDATE_URL)) {
                    throw new InvalidArgumentException("Field '{$field->label}' harus berupa URL yang diawali http:// atau https://.");
                }
                return $val;

            case 'select':
                $choices = $this->extractChoices($options);
                $val = (string) $value;
                if (! in_array($val, $choices, true)) {
                    throw new InvalidArgumentException("Pilihan '{$val}' pada '{$field->label}' tidak valid.");
                }
                return $val;

            case 'multiselect':
                if (! is_array($value)) {
                    throw new InvalidArgumentException("Field '{$field->label}' harus berupa array pilihan.");
                }
                $choices = $this->extractChoices($options);
                $maxItems = $options['max_items'] ?? null;
                if ($maxItems && count($value) > (int) $maxItems) {
                    throw new InvalidArgumentException("Field '{$field->label}' maksimal memilih {$maxItems} opsi.");
                }
                $cleanArray = [];
                foreach ($value as $item) {
                    $sItem = (string) $item;
                    if (! in_array($sItem, $choices, true)) {
                        throw new InvalidArgumentException("Pilihan '{$sItem}' pada '{$field->label}' tidak valid.");
                    }
                    $cleanArray[] = $sItem;
                }
                return array_values(array_unique($cleanArray));

            case 'file':
                if (! is_string($value)) {
                    throw new InvalidArgumentException("Field '{$field->label}' harus berupa path file.");
                }
                return trim((string) $value);

            case 'relation':
                $targetSlug = $options['relation']['entity'] ?? null;
                if (! $targetSlug) {
                    return $value;
                }
                $this->verifyRelationTargetExists($targetSlug, $value, $field->label);
                return $value;

            case 'relation_many':
                if (! is_array($value)) {
                    throw new InvalidArgumentException("Field '{$field->label}' harus berupa array ID relasi.");
                }
                $targetSlug = $options['relation']['entity'] ?? null;
                if ($targetSlug) {
                    foreach ($value as $id) {
                        $this->verifyRelationTargetExists($targetSlug, $id, $field->label);
                    }
                }
                return array_values(array_unique($value));

            default:
                return $value;
        }
    }

    /**
     * Verify that target entity record or bound row exists.
     */
    private function verifyRelationTargetExists(string $targetSlug, mixed $targetId, string $fieldLabel): void
    {
        $targetEntity = DynEntity::where('slug', $targetSlug)->first();
        if (! $targetEntity) {
            throw new InvalidArgumentException("Target relasi '{$targetSlug}' untuk '{$fieldLabel}' tidak ditemukan.");
        }

        if ($targetEntity->isBound()) {
            $pk = $targetEntity->source_pk ?: 'id';
            $table = $targetEntity->source_table;
            $schema = $targetEntity->source_schema;
            $tableIdentifier = $schema ? "{$schema}.{$table}" : $table;

            $exists = DB::table($tableIdentifier)->where($pk, $targetId)->exists();
            if (! $exists) {
                throw new InvalidArgumentException("Data referensi ID '{$targetId}' pada tabel '{$table}' tidak ditemukan.");
            }
        } else {
            $exists = DynRecord::where('entity_id', $targetEntity->id)->where('id', $targetId)->exists();
            if (! $exists) {
                throw new InvalidArgumentException("Data referensi ID '{$targetId}' pada entitas '{$targetSlug}' tidak ditemukan.");
            }
        }
    }

    /**
     * Extract string list of choices from field options.
     *
     * @return array<int, string>
     */
    private function extractChoices(array $options): array
    {
        $rawChoices = $options['choices'] ?? [];
        $choices = [];

        foreach ($rawChoices as $choice) {
            if (is_array($choice)) {
                $choices[] = (string) ($choice['value'] ?? '');
            } else {
                $choices[] = (string) $choice;
            }
        }

        return $choices;
    }
}
