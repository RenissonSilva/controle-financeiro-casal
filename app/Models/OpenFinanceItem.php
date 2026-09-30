<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class OpenFinanceItem extends Model
{
    protected $fillable = ['item_id', 'connector_name', 'owner', 'owner_document', 'status', 'last_synced_at', 'last_sync_error'];

    protected $casts = [
        'last_synced_at' => 'datetime',
    ];

    public function accounts(): HasMany
    {
        return $this->hasMany(OpenFinanceAccount::class);
    }

    public function investments(): HasMany
    {
        return $this->hasMany(OpenFinanceInvestment::class);
    }

    public function expenses(): HasMany
    {
        return $this->hasMany(Expense::class);
    }
}
