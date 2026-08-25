<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DynMenuSetting extends Model
{
    use HasFactory;

    protected $table = 'dyn_menu_settings';

    protected $fillable = [
        'menu_key',
        'is_active',
        'menu_order',
        'icon',
        'custom_label',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'menu_order' => 'integer',
        ];
    }
}
