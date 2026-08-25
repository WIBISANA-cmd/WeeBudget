<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DynUniqueValue extends Model
{
    use HasFactory;

    protected $table = 'dyn_unique_values';

    protected $fillable = [
        'entity_id',
        'record_id',
        'field_key',
        'value',
    ];

    public function entity(): BelongsTo
    {
        return $this->belongsTo(DynEntity::class, 'entity_id');
    }

    public function record(): BelongsTo
    {
        return $this->belongsTo(DynRecord::class, 'record_id');
    }
}
