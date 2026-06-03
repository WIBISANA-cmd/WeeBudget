<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CoupleSavingsSetting extends Model
{
    protected $fillable = [
        'partner_one_user_id',
        'partner_two_user_id',
        'created_by',
        'updated_by',
    ];

    public function partnerOne()
    {
        return $this->belongsTo(User::class, 'partner_one_user_id');
    }

    public function partnerTwo()
    {
        return $this->belongsTo(User::class, 'partner_two_user_id');
    }
}
