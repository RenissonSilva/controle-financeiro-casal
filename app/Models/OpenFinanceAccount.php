<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OpenFinanceAccount extends Model
{
    protected $fillable = [
        'open_finance_item_id', 'external_id', 'type', 'subtype', 'name', 'number', 'balance',
        'currency_code', 'credit_limit', 'available_credit_limit', 'bill_due_date', 'minimum_payment',
    ];

    protected $casts = [
        'balance' => 'float',
        'credit_limit' => 'float',
        'available_credit_limit' => 'float',
        'minimum_payment' => 'float',
        'bill_due_date' => 'date',
    ];

    public function item(): BelongsTo
    {
        return $this->belongsTo(OpenFinanceItem::class, 'open_finance_item_id');
    }

    public function isCreditCard(): bool
    {
        return $this->type === 'CREDIT';
    }
}
