<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

class FixedExpense extends Model
{
    protected $fillable = [
        'description', 'amount', 'variable_amount', 'due_day', 'start_date', 'end_date', 'category_id',
        'ownership', 'match_document', 'match_pattern', 'active',
    ];

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

    public function occurrences(): HasMany
    {
        return $this->hasMany(FixedExpenseOverride::class);
    }

    // Mantido pelo nome antigo (rotas "occurrence" já usavam esse relacionamento).
    public function overrides(): HasMany
    {
        return $this->occurrences();
    }

    // Data em que a cobrança cai dentro do mês/ano informado, ajustada para o último dia do mês se necessário.
    public function dueDateFor(int $year, int $month): Carbon
    {
        $day = min($this->due_day, Carbon::createFromDate($year, $month, 1)->daysInMonth);

        return Carbon::createFromDate($year, $month, $day)->startOfDay();
    }

    // Data de cobrança desta conta dentro do intervalo do ciclo (respeitando a vigência), ou null.
    public function dueDateInRange(Carbon $rangeStart, Carbon $rangeEnd): ?Carbon
    {
        $months = collect([$rangeStart, $rangeEnd])->map(fn (Carbon $d) => $d->format('Y-m'))->unique();

        foreach ($months as $yearMonth) {
            [$year, $month] = explode('-', $yearMonth);
            $candidate = $this->dueDateFor((int) $year, (int) $month);

            if (! $candidate->between($rangeStart, $rangeEnd)) {
                continue;
            }

            if ($this->start_date && $candidate->lt($this->start_date)) {
                return null;
            }

            if ($this->end_date && $candidate->gt($this->end_date)) {
                return null;
            }

            return $candidate;
        }

        return null;
    }

    public function hasPaymentMatcher(): bool
    {
        return filled($this->match_document) || filled($this->match_pattern);
    }

    /**
     * Projeta as contas fixas ativas para dentro do ciclo de fatura informado: data de
     * cobrança, valor (real do mês, se ajustado) e se já foi paga — paga = existe um
     * lançamento vinculado à ocorrência (ver FixedExpenseMatcher).
     */
    public static function projectForCycle(Carbon $rangeStart, Carbon $rangeEnd): Collection
    {
        $today = Carbon::today();

        $occurrences = FixedExpenseOverride::with('expense')
            ->whereBetween('due_date', [$rangeStart->toDateString(), $rangeEnd->toDateString()])
            ->get()
            ->keyBy(fn (FixedExpenseOverride $o) => $o->fixed_expense_id.'|'.$o->due_date->toDateString());

        return static::with('category')
            ->where('active', true)
            ->get()
            ->map(function (FixedExpense $fixedExpense) use ($rangeStart, $rangeEnd, $today, $occurrences) {
                $dueDate = $fixedExpense->dueDateInRange($rangeStart, $rangeEnd);

                if (! $dueDate) {
                    return null;
                }

                $occurrence = $occurrences->get($fixedExpense->id.'|'.$dueDate->toDateString());
                $payment = $occurrence?->expense;
                $plannedAmount = $occurrence?->amount ?? $fixedExpense->amount;

                $status = match (true) {
                    $payment !== null => 'paid',
                    $dueDate->greaterThanOrEqualTo($today) => 'upcoming',
                    default => 'late',
                };

                return [
                    'id' => $fixedExpense->id,
                    'description' => $fixedExpense->description,
                    // Paga: vale o que saiu de fato. Em aberto: valor ajustado do mês ou a estimativa.
                    'amount' => $payment ? $payment->amount : $plannedAmount,
                    'planned_amount' => $plannedAmount,
                    'estimated_amount' => $fixedExpense->amount,
                    'variable_amount' => $fixedExpense->variable_amount,
                    'occurrence_id' => $occurrence?->id,
                    'has_amount_override' => $occurrence?->amount !== null,
                    'category' => $fixedExpense->category?->name,
                    'color' => $fixedExpense->category?->color ?? '#94a3b8',
                    'ownership' => $fixedExpense->ownership,
                    'due_date' => $dueDate->toDateString(),
                    'is_upcoming' => $dueDate->greaterThanOrEqualTo($today),
                    'status' => $status,
                    'has_matcher' => $fixedExpense->hasPaymentMatcher(),
                    'payment' => $payment ? [
                        'id' => $payment->id,
                        'date' => $payment->date->toDateString(),
                        'amount' => $payment->amount,
                        'description' => $payment->custom_name ?: $payment->displayName(),
                    ] : null,
                ];
            })
            ->filter()
            ->sortBy('due_date')
            ->values();
    }
}
