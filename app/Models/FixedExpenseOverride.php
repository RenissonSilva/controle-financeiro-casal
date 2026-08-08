<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FixedExpenseOverride extends Model
{
    protected $fillable = ['fixed_expense_id', 'due_date', 'amount'];

    protected $casts = [
        'due_date' => 'date',
        'amount' => 'float',
    ];

    public function fixedExpense(): BelongsTo
    {
        return $this->belongsTo(FixedExpense::class);
    }
}
