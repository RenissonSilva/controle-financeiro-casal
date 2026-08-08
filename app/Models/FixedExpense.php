<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

class FixedExpense extends Model
{
    protected $fillable = ['description', 'amount', 'variable_amount', 'due_day', 'start_date', 'end_date', 'category_id', 'ownership', 'active'];

    protected $casts = [
        'amount' => 'float',
        'variable_amount' => 'boolean',
        'due_day' => 'integer',
        'start_date' => 'date',
        'end_date' => 'date',
        'active' => 'boolean',
    ];

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function overrides(): HasMany
    {
        return $this->hasMany(FixedExpenseOverride::class);
    }

    // Data em que a cobrança cai dentro do mês/ano informado, ajustada para o último dia do mês se necessário.
    public function dueDateFor(int $year, int $month): Carbon
    {
        $day = min($this->due_day, Carbon::createFromDate($year, $month, 1)->daysInMonth);

        return Carbon::createFromDate($year, $month, $day)->startOfDay();
    }

    /**
     * Projeta as despesas fixas ativas para dentro do ciclo de fatura informado,
     * calculando a data de cobrança de cada uma e se ela ainda está por vir.
     */
    public static function projectForCycle(Carbon $rangeStart, Carbon $rangeEnd): Collection
    {
        $today = Carbon::today();
        $months = collect([$rangeStart, $rangeEnd])->map(fn (Carbon $d) => $d->format('Y-m'))->unique();

        // Ajustes de valor lançados para cobranças de despesas variáveis dentro deste ciclo.
        $overrides = FixedExpenseOverride::whereBetween('due_date', [$rangeStart->toDateString(), $rangeEnd->toDateString()])
            ->get()
            ->keyBy(fn (FixedExpenseOverride $o) => $o->fixed_expense_id.'|'.$o->due_date->toDateString());

        return static::with('category')
            ->where('active', true)
            ->get()
            ->map(function (FixedExpense $fixedExpense) use ($months, $rangeStart, $rangeEnd, $today, $overrides) {
                $dueDate = null;

                foreach ($months as $yearMonth) {
                    [$year, $month] = explode('-', $yearMonth);
                    $candidate = $fixedExpense->dueDateFor((int) $year, (int) $month);

                    if ($candidate->between($rangeStart, $rangeEnd)) {
                        $dueDate = $candidate;
                        break;
                    }
                }

                if (! $dueDate) {
                    return null;
                }

                if ($fixedExpense->start_date && $dueDate->lt($fixedExpense->start_date)) {
                    return null;
                }

                if ($fixedExpense->end_date && $dueDate->gt($fixedExpense->end_date)) {
                    return null;
                }

                $override = $overrides->get($fixedExpense->id.'|'.$dueDate->toDateString());

                return [
                    'id' => $fixedExpense->id,
                    'description' => $fixedExpense->description,
                    'amount' => $override->amount ?? $fixedExpense->amount,
                    'estimated_amount' => $fixedExpense->amount,
                    'variable_amount' => $fixedExpense->variable_amount,
                    'occurrence_id' => $override?->id,
                    'category' => $fixedExpense->category?->name,
                    'color' => $fixedExpense->category?->color ?? '#94a3b8',
                    'ownership' => $fixedExpense->ownership,
                    'due_date' => $dueDate->toDateString(),
                    'is_upcoming' => $dueDate->greaterThanOrEqualTo($today),
                ];
            })
            ->filter()
            ->sortBy('due_date')
            ->values();
    }
}
