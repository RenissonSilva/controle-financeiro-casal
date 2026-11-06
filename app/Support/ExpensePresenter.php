<?php

namespace App\Support;

use App\Models\Expense;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Formato único de um lançamento para as telas (Home, Lançamentos, detalhes da conexão).
 */
class ExpensePresenter
{
    public const KIND_REASONS = [
        'bill_payment' => 'Pagamento de fatura',
        'card_payment' => 'Pagamento do cartão',
        'investment' => 'Aplicação ou resgate',
        'own_transfer' => 'Entre suas contas',
        'internal' => 'Movimentação interna',
        'rule' => 'Ignorado por regra',
        'user' => 'Ignorado por você',
        'refund' => 'Estorno',
    ];

    /**
     * @param  Collection<int, Expense>|null  $installments  parcelas da mesma compra (InstallmentPurchase),
     *                                                       para o formulário dividir a compra toda
     */
    public static function row(Expense $expense, ?Collection $installments = null): array
    {
        [$prefix, $name] = self::splitDescription($expense->description);

        return [
            'id' => $expense->id,
            // Nome personalizado pelo casal, quando houver; `bank_name` guarda o que veio do banco.
            'name' => $expense->custom_name ?: $name,
            'bank_name' => $name,
            'custom_name' => $expense->custom_name,
            'name_pattern' => $expense->relationLoaded('nameRule') ? $expense->nameRule?->pattern : null,
            'prefix' => $prefix,
            'description' => $expense->description,
            'notes' => $expense->notes,
            'date' => $expense->date->toDateString(),
            // Horário da compra/transferência; no cartão a compra pode ser da véspera do dia da fatura.
            'time' => $expense->occurred_at?->format('H:i'),
            'occurred_on' => $expense->occurred_at?->toDateString(),
            'competence' => $expense->competence,
            'amount' => $expense->amount,
            'direction' => $expense->direction,
            'kind' => $expense->kind,
            'kind_reason' => $expense->kind_reason,
            'kind_label' => self::KIND_REASONS[$expense->kind_reason] ?? null,
            'kind_locked' => $expense->kind_locked,
            'category_id' => $expense->category_id,
            'category' => $expense->category?->name,
            'color' => $expense->category?->color,
            'category_source' => $expense->category_source,
            'ownership' => $expense->ownership,
            'ownership_scope' => $expense->ownership_scope,
            // Divisão definida à mão (só em "Nós"); null = pela proporção de renda.
            'custom_payer1_share' => $expense->hasCustomSplit() ? $expense->payer1_share : null,
            'purchase' => $installments?->isNotEmpty() ? [
                'count' => $expense->installment_total,
                'items' => $installments->map(fn (Expense $item) => [
                    'id' => $item->id,
                    'number' => $item->installment_number,
                    'amount' => $item->amount,
                    'competence' => $item->competence,
                    'payer1_share' => $item->hasCustomSplit() ? $item->payer1_share : null,
                ])->values()->all(),
            ] : null,
            'source' => $expense->source,
            'origin' => $expense->origin,
            'account_type' => $expense->account_type,
            'bank_status' => $expense->bank_status,
            'bank_category' => $expense->bank_category,
            'installment' => $expense->installment_number && $expense->installment_total
                ? "{$expense->installment_number}/{$expense->installment_total}"
                : null,
            'currency_code' => $expense->currency_code && $expense->currency_code !== 'BRL' ? $expense->currency_code : null,
            'original_amount' => $expense->original_amount,
            'bill_due_date' => $expense->bill_due_date?->toDateString(),
            'counterparty_name' => $expense->counterparty_name,
            'merchant' => MerchantLogo::for($expense),
            'fixed_expense' => $expense->relationLoaded('fixedOccurrence') ? $expense->fixedOccurrence?->fixedExpense?->description : null,
            'fixed_expense_id' => $expense->relationLoaded('fixedOccurrence') ? $expense->fixedOccurrence?->fixed_expense_id : null,
            'is_future' => $expense->date->gt(Carbon::today()),
            'status' => $expense->status,
        ];
    }

    /**
     * "Transferência enviada|Fulano" → ["Transferência enviada", "Fulano"]. Sem "|" o
     * prefixo fica vazio e o nome é a descrição inteira.
     *
     * @return array{0: ?string, 1: string}
     */
    public static function splitDescription(string $description): array
    {
        if (str_contains($description, '|')) {
            [$prefix, $name] = array_map('trim', explode('|', $description, 2));

            if ($name !== '') {
                return [$prefix, $name];
            }
        }

        return [null, $description];
    }
}
