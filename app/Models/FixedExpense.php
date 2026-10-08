<?php

namespace App\Models;

use App\Models\Concerns\RecordsActivity;
use App\Support\MerchantLogo;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

class FixedExpense extends Model
{
    use RecordsActivity;

    protected $fillable = [
        'description', 'amount', 'variable_amount', 'previous_cycle', 'due_day', 'start_date', 'end_date', 'category_id',
        'ownership', 'match_document', 'match_pattern', 'active',
    ];

    protected $casts = [
        'amount' => 'float',
        'variable_amount' => 'boolean',
        'previous_cycle' => 'boolean',
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

    /**
     * Cobrança desta conta que pertence ao mês financeiro informado. Conta do mês anterior
     * (energia: o consumo de setembro é pago no começo de outubro) é a que vence no ciclo
     * seguinte. Com $byDueDate, é sempre a que vence dentro do próprio ciclo.
     */
    public function dueDateForCycle(string $month, Setting $settings, bool $byDueDate = false): ?Carbon
    {
        $dueCycle = $this->previous_cycle && ! $byDueDate ? Setting::shiftCycle($month, 1) : $month;

        return $this->dueDateInRange(...$settings->billingCycleRange($dueCycle));
    }

    public function hasPaymentMatcher(): bool
    {
        return filled($this->match_document) || filled($this->match_pattern);
    }

    /**
     * Empresa da conta, para a logo: pelo que reconhece o pagamento (documento ou padrão) ou pelo
     * nome; senão, pelo pagamento já vinculado.
     *
     * @return array{slug: string, name: string, logo: string}|null
     */
    public function merchant(?Expense $payment = null): ?array
    {
        return MerchantLogo::forDocument($this->match_document)
            ?? MerchantLogo::match($this->match_pattern, $this->description)
            ?? ($payment ? MerchantLogo::for($payment) : null);
    }

    /**
     * Projeta as contas fixas ativas para dentro do mês financeiro informado: data de
     * cobrança, valor (real do mês, se ajustado) e se já foi paga — paga = existe um
     * lançamento vinculado à ocorrência (ver FixedExpenseMatcher). Com $byDueDate, pega as
     * cobranças que vencem no ciclo mesmo quando são do mês anterior (visão do caixa).
     */
    public static function projectForCycle(string $month, Setting $settings, bool $byDueDate = false): Collection
    {
        $today = Carbon::today();
        // Cobranças do mês anterior vencem no ciclo seguinte: busca as dos dois.
        [$rangeStart] = $settings->billingCycleRange($month);
        [, $rangeEnd] = $settings->billingCycleRange(Setting::shiftCycle($month, 1));

        $occurrences = FixedExpenseOverride::with('expense')
            ->whereBetween('due_date', [$rangeStart->toDateString(), $rangeEnd->toDateString()])
            ->get()
            ->keyBy(fn (FixedExpenseOverride $o) => $o->fixed_expense_id.'|'.$o->due_date->toDateString());

        return static::with('category')
            ->where('active', true)
            ->get()
            ->map(function (FixedExpense $fixedExpense) use ($month, $settings, $byDueDate, $today, $occurrences) {
                $dueDate = $fixedExpense->dueDateForCycle($month, $settings, $byDueDate);

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
                    'merchant' => $fixedExpense->merchant($payment),
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

    // ---- Histórico de mudanças ----

    public function activityArea(): string
    {
        return 'fixed';
    }

    public function activityNoun(): string
    {
        return 'a conta fixa';
    }

    public function activityLabel(): string
    {
        return $this->description;
    }

    public function activityFields(): array
    {
        return [
            'description' => 'Descrição',
            'amount' => ['Valor', 'money'],
            'variable_amount' => ['Valor variável', 'bool'],
            'previous_cycle' => ['Paga o consumo do mês anterior', 'bool'],
            'due_day' => 'Dia da cobrança',
            'start_date' => ['Começa em', 'date'],
            'end_date' => ['Termina em', 'date'],
            'category_id' => ['Categoria', 'category'],
            'ownership' => ['De quem é', 'payer'],
            'match_document' => 'Reconhece Pix para (CPF/CNPJ)',
            'match_pattern' => 'Reconhece descrição com',
            'active' => ['Ativa', 'bool'],
        ];
    }
}
