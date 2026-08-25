<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DynRecord extends Model
{
    use HasFactory;

    protected $table = 'dyn_records';

    protected $fillable = [
        'entity_id',
        'data',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'data' => 'array',
        ];
    }

    public function entity(): BelongsTo
    {
        return $this->belongsTo(DynEntity::class, 'entity_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function uniqueValues(): HasMany
    {
        return $this->hasMany(DynUniqueValue::class, 'record_id');
    }
}
