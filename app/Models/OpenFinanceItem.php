<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OpenFinanceItem extends Model
{
    protected $fillable = ['item_id', 'connector_name', 'owner', 'status', 'last_synced_at'];

    protected $casts = [
        'last_synced_at' => 'datetime',
    ];
}
