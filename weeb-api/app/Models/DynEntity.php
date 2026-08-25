<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DynEntity extends Model
{
    use HasFactory;

    protected $table = 'dyn_entities';

    protected $fillable = [
        'slug',
        'label',
        'label_plural',
        'icon',
        'description',
        'is_active',
        'features',
        'menu_order',
        'source_schema',
        'source_table',
        'source_pk',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'features' => 'array',
            'menu_order' => 'integer',
        ];
    }

    public function fields(): HasMany
    {
        return $this->hasMany(DynField::class, 'entity_id')->orderBy('order_index');
    }

    public function records(): HasMany
    {
        return $this->hasMany(DynRecord::class, 'entity_id');
    }

    public function uniqueValues(): HasMany
    {
        return $this->hasMany(DynUniqueValue::class, 'entity_id');
    }

    public function isBound(): bool
    {
        return ! empty($this->source_table);
    }

    public function hasFeature(string $feature): bool
    {
        $features = $this->features ?? ['create', 'edit', 'delete', 'search', 'filter', 'export', 'import'];

        return in_array($feature, $features, true);
    }

    protected static function booted(): void
    {
        static::saved(fn () => app(\App\Services\DynamicSchema\MetadataService::class)->clearCache());
        static::deleted(fn () => app(\App\Services\DynamicSchema\MetadataService::class)->clearCache());
    }
}
