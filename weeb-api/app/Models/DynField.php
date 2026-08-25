<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DynField extends Model
{
    use HasFactory;

    protected $table = 'dyn_fields';

    protected $fillable = [
        'entity_id',
        'key',
        'label',
        'type',
        'is_required',
        'is_unique',
        'default_value',
        'options',
        'order_index',
        'list_visible',
        'form_visible',
        'placeholder',
        'help_text',
    ];

    protected function casts(): array
    {
        return [
            'is_required' => 'boolean',
            'is_unique' => 'boolean',
            'options' => 'array',
            'order_index' => 'integer',
            'list_visible' => 'boolean',
            'form_visible' => 'boolean',
        ];
    }

    public function entity(): BelongsTo
    {
        return $this->belongsTo(DynEntity::class, 'entity_id');
    }

    protected static function booted(): void
    {
        static::saved(fn () => app(\App\Services\DynamicSchema\MetadataService::class)->clearCache());
        static::deleted(fn () => app(\App\Services\DynamicSchema\MetadataService::class)->clearCache());
    }
}
