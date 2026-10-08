<?php

namespace App\Models;

use App\Models\Concerns\RecordsActivity;
use App\Support\Activity;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * Qualquer movimentação do casal: despesa, receita, Pix de acerto ou lançamento ignorado.
 * O nome ficou "Expense" porque despesa é o caso principal; `kind` diz como ela entra
 * nos cálculos e `direction` diz se o dinheiro saiu ou entrou na conta de origem.
 */
class Expense extends Model
{
    use RecordsActivity;

    public const KIND_EXPENSE = 'expense';
    public const KIND_INCOME = 'income';
    public const KIND_SETTLEMENT = 'settlement';
    public const KIND_IGNORED = 'ignored';

    public const KINDS = [self::KIND_EXPENSE, self::KIND_INCOME, self::KIND_SETTLEMENT, self::KIND_IGNORED];

    protected $fillable = [
        'description',
        'custom_name',
        'name_rule_id',
        'notes',
        'amount',
        'direction',
        'kind',
        'kind_reason',
        'kind_locked',
        'date',
        'occurred_at',
        'bill_due_date',
        'bill_closing_date',
        'category_id',
        'category_source',
        'ownership',
        'ownership_scope',
        'status',
        'bank_status',
        'bank_category',
        'counterparty_name',
        'counterparty_document',
        'original_amount',
        'currency_code',
        'installment_number',
        'installment_total',
        'source',
        'origin',
        'open_finance_item_id',
        'external_id',
        'account_id',
        'account_type',
    ];

    protected $casts = [
        'amount' => 'float',
        'original_amount' => 'float',
        'date' => 'date',
        'occurred_at' => 'datetime',
        'bill_due_date' => 'date',
        'bill_closing_date' => 'date',
        'kind_locked' => 'boolean',
        'installment_number' => 'integer',
        'installment_total' => 'integer',
        'competence_shift' => 'integer',
    ];

    protected static function booted(): void
    {
        // Mês financeiro sempre derivado de data/fatura — nunca informado na mão.
        static::saving(function (self $expense) {
            if ($expense->isDirty(['date', 'bill_closing_date', 'bill_due_date', 'kind', 'competence_shift']) || ! $expense->competence) {
                $expense->competence = $expense->computeCompetence(Setting::current());
            }
        });
    }

    // Competência pela data/fatura, deslocada quando paga uma conta fixa do mês anterior.
    public function computeCompetence(Setting $settings): string
    {
        $competence = $settings->competenceFor($this->date, $this->bill_closing_date, $this->bill_due_date, $this->kind);

        return $this->competence_shift ? Setting::shiftCycle($competence, $this->competence_shift) : $competence;
    }

    // Recalcula a competência de todos os lançamentos (ex: depois de mudar o dia de fechamento).
    public static function recalculateCompetence(): void
    {
        $settings = Setting::current();

        static::query()->select(['id', 'date', 'bill_closing_date', 'bill_due_date', 'kind', 'competence', 'competence_shift'])->chunkById(500, function ($expenses) use ($settings) {
            foreach ($expenses as $expense) {
                $competence = $expense->computeCompetence($settings);

                if ($competence !== $expense->competence) {
                    static::whereKey($expense->id)->update(['competence' => $competence]);
                }
            }
        });
    }

    /**
     * Pagamento de conta fixa "do mês anterior" (ver FixedExpense::$previous_cycle) conta um ciclo
     * antes; os demais voltam para o ciclo da data. Idempotente — rodar depois de qualquer mudança
     * de vínculo ou da conta fixa.
     */
    public static function syncCompetenceShifts(): void
    {
        $shifted = FixedExpenseOverride::whereNotNull('expense_id')
            ->whereHas('fixedExpense', fn (Builder $query) => $query->where('previous_cycle', true))
            ->pluck('expense_id');

        $apply = fn (int $shift) => fn (self $expense) => $expense->forceFill(['competence_shift' => $shift])->save();

        static::whereIn('id', $shifted)->where('competence_shift', '!=', -1)->get()->each($apply(-1));
        static::whereNotIn('id', $shifted)->where('competence_shift', '!=', 0)->get()->each($apply(0));
    }

    protected $attributes = [
        'direction' => 'out',
        'kind' => self::KIND_EXPENSE,
        'origin' => 'manual',
        'ownership' => 'both',
        'status' => 'categorized',
        'source' => 'payer1',
    ];

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function nameRule(): BelongsTo
    {
        return $this->belongsTo(NameRule::class);
    }

    public function openFinanceItem(): BelongsTo
    {
        return $this->belongsTo(OpenFinanceItem::class);
    }

    // Ocorrência de conta fixa que este lançamento pagou (se houver).
    public function fixedOccurrence(): HasOne
    {
        return $this->hasOne(FixedExpenseOverride::class);
    }

    /**
     * Valor com sinal do ponto de vista de "gasto": saída soma, entrada (estorno) abate.
     * Para receita/acerto o sinal é o inverso — ver incomeAmount().
     */
    public function expenseAmount(): float
    {
        return $this->direction === 'in' ? -$this->amount : $this->amount;
    }

    public function incomeAmount(): float
    {
        return $this->direction === 'in' ? $this->amount : -$this->amount;
    }

    public function scopeBetweenDates(Builder $query, \DateTimeInterface $start, \DateTimeInterface $end): Builder
    {
        return $query->whereBetween('date', [$start->format('Y-m-d'), $end->format('Y-m-d')]);
    }

    // Lançamentos de um ou mais meses financeiros (Y-m).
    public function scopeInCompetence(Builder $query, string ...$months): Builder
    {
        return count($months) === 1 ? $query->where('competence', $months[0]) : $query->whereIn('competence', $months);
    }

    // Mais recentes primeiro; no mesmo dia, pelo horário (os sem horário vão para o fim do dia).
    public function scopeNewestFirst(Builder $query): Builder
    {
        return $query->orderByDesc('date')->orderByDesc('occurred_at')->orderByDesc('id');
    }

    public function scopeOfKind(Builder $query, string ...$kinds): Builder
    {
        return $query->whereIn('kind', $kinds);
    }

    public function isFromOpenFinance(): bool
    {
        return $this->origin === 'open_finance';
    }

    /**
     * Dá um nome personalizado a este lançamento por meio de uma regra de nome: o filtro
     * (padrão: a descrição exata) decide quais outros lançamentos — de agora e das próximas
     * sincronizações — recebem o mesmo nome. Filtro já existente tem o nome trocado; mesmo
     * nome com filtro novo ajusta a regra atual; nome vazio apaga a regra atual. Devolve a
     * regra que ficou valendo.
     */
    public function rename(?string $name, ?string $pattern = null): ?NameRule
    {
        $name = trim((string) $name) ?: null;
        $pattern = trim((string) $pattern) ?: NameRule::exactPattern($this->description);
        $current = $this->nameRule;

        if ($name === null) {
            $current?->delete();
        } else {
            // Mesmo nome com outro filtro = ajustar o filtro da regra; nome novo = regra nova.
            $rule = NameRule::where('pattern', $pattern)->first()
                ?? ($current?->name === $name ? $current : new NameRule);
            $rule->fill(['pattern' => $pattern, 'name' => $name])->save();
        }

        NameRule::apply();
        $this->refresh();

        return $this->nameRule;
    }

    // Nome amigável: tira o prefixo "Transferência enviada|" e afins que o banco coloca.
    public function displayName(): string
    {
        $description = $this->description;

        if (str_contains($description, '|')) {
            [$prefix, $rest] = explode('|', $description, 2);
            $rest = trim($rest);

            if ($rest !== '') {
                return $rest;
            }
        }

        return $description;
    }

    // ---- Histórico de mudanças ----

    public function activityArea(): string
    {
        return 'expenses';
    }

    public function activityNoun(): string
    {
        return 'o lançamento';
    }

    public function activityLabel(): string
    {
        return Activity::expenseLabel($this);
    }

    public function activityFields(): array
    {
        return [
            'description' => 'Descrição',
            'amount' => ['Valor', 'money'],
            'date' => ['Data', 'date'],
            'kind' => ['Tipo', 'kind'],
            'category_id' => ['Categoria', 'category'],
            'ownership' => ['De quem é', 'payer'],
            'source' => ['Pago por', 'payer'],
            'notes' => 'Observação',
        ];
    }
}
