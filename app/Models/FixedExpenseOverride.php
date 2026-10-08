<?php

namespace App\Models;

use App\Models\Concerns\RecordsActivity;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Uma cobrança (ocorrência mensal) de uma conta fixa. Guarda o valor real do mês quando a
 * conta é variável (`amount`) e/ou o lançamento que a pagou (`expense_id`).
 */
class FixedExpenseOverride extends Model
{
    use RecordsActivity;

    protected $fillable = ['fixed_expense_id', 'due_date', 'amount', 'expense_id', 'skip_auto_match'];

    protected $casts = [
        'due_date' => 'date',
        'amount' => 'float',
        'skip_auto_match' => 'boolean',
    ];

    protected static function booted(): void
    {
        // Vínculo novo/desfeito pode mudar o mês do pagamento (conta do mês anterior).
        static::saved(function (self $occurrence) {
            if ($occurrence->wasChanged('expense_id') || ($occurrence->wasRecentlyCreated && $occurrence->expense_id)) {
                Expense::syncCompetenceShifts();
            }
        });
        static::deleted(fn (self $occurrence) => $occurrence->expense_id && Expense::syncCompetenceShifts());
    }

    public function fixedExpense(): BelongsTo
    {
        return $this->belongsTo(FixedExpense::class);
    }

    public function expense(): BelongsTo
    {
        return $this->belongsTo(Expense::class);
    }

    // ---- Histórico de mudanças ----

    public function activityArea(): string
    {
        return 'fixed';
    }

    public function activityNoun(): string
    {
        return 'a cobrança';
    }

    // "Aluguel · vence 10/10/2026"
    public function activityLabel(): string
    {
        return ($this->fixedExpense?->description ?? 'Conta fixa').' · vence '.$this->due_date?->format('d/m/Y');
    }

    public function activityFields(): array
    {
        return [
            'amount' => ['Valor do mês', 'money'],
            'expense_id' => ['Pagamento', 'expense'],
        ];
    }

    // Apagar a cobrança = voltar a usar a estimativa (não some nada da tela).
    public function activityDescription(string $action): string
    {
        return $action === 'deleted' ? 'voltou à estimativa a cobrança' : 'ajustou a cobrança';
    }
}
