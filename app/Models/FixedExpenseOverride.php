<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Uma cobrança (ocorrência mensal) de uma conta fixa. Guarda o valor real do mês quando a
 * conta é variável (`amount`) e/ou o lançamento que a pagou (`expense_id`).
 */
class FixedExpenseOverride extends Model
{
    protected $fillable = ['fixed_expense_id', 'due_date', 'amount', 'expense_id', 'skip_auto_match'];

    protected $casts = [
        'due_date' => 'date',
        'amount' => 'float',
        'skip_auto_match' => 'boolean',
    ];

    public function fixedExpense(): BelongsTo
    {
        return $this->belongsTo(FixedExpense::class);
    }

    public function expense(): BelongsTo
    {
        return $this->belongsTo(Expense::class);
    }
}
