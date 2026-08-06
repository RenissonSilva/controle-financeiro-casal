<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

class FixedExpense extends Model
{
    protected $fillable = ['description', 'amount', 'due_day', 'category_id', 'ownership', 'active'];

    protected $casts = [
        'amount'  => 'float',
        'due_day' => 'integer',
        'active'  => 'boolean',
    ];

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    // Data em que a cobrança cai dentro do mês/ano informado, ajustada para o último dia do mês se necessário.
    public function dueDateFor(int $year, int $month): Carbon
    {
        $day = min($this->due_day, Carbon::createFromDate($year, $month, 1)->daysInMonth);

        return Carbon::createFromDate($year, $month, $day)->startOfDay();
    }
}
