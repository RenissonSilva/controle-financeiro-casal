<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OpenFinanceInvestment extends Model
{
    protected $fillable = ['open_finance_item_id', 'external_id', 'type', 'subtype', 'name', 'balance', 'status'];

    protected $casts = [
        'balance' => 'float',
    ];

    public function item(): BelongsTo
    {
        return $this->belongsTo(OpenFinanceItem::class, 'open_finance_item_id');
    }

    // "CDB - NU FINANCEIRA S.A. - SOCIEDADE DE CREDITO, ..." → "CDB · NU FINANCEIRA S.A."
    public function shortName(): string
    {
        $parts = array_map('trim', explode(' - ', (string) $this->name));

        return implode(' · ', array_slice($parts, 0, 2)) ?: ($this->subtype ?? 'Investimento');
    }
}
