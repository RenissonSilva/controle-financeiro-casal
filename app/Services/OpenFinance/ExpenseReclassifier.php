<?php

namespace App\Services\OpenFinance;

use App\Models\CategorizationRule;
use App\Models\Expense;
use App\Models\OpenFinanceItem;
use App\Services\Categorization\Categorizer;

/**
 * Refaz a classificação (despesa/receita/ignorado) dos lançamentos do banco a partir dos
 * dados já guardados — usado quando mudam as regras de "ignorar". Lançamentos cujo tipo foi
 * escolhido pelo usuário (kind_locked) não mudam.
 */
class ExpenseReclassifier
{
    public function __construct(private readonly Categorizer $categorizer) {}

    public function run(): int
    {
        $rules = CategorizationRule::all();
        $classifiers = OpenFinanceItem::pluck('owner_document', 'id')->map(
            fn (?string $document) => new TransactionClassifier($document)
        );
        $fallback = new TransactionClassifier();
        $changed = 0;
        $pending = [];

        Expense::where('origin', 'open_finance')->where('kind_locked', false)->chunkById(500, function ($expenses) use ($classifiers, $fallback, $rules, &$changed, &$pending) {
            foreach ($expenses as $expense) {
                $classifier = $classifiers->get($expense->open_finance_item_id, $fallback);

                $expense->fill($classifier->classify($expense->only([
                    'description', 'amount', 'direction', 'bank_category', 'counterparty_name', 'counterparty_document', 'account_type',
                ]), $rules));

                if ($expense->isDirty('kind') && $expense->kind === Expense::KIND_EXPENSE && ! $expense->category_id && $expense->category_source !== 'user') {
                    $expense->status = 'pending';
                    $pending[] = $expense->id;
                }

                if ($expense->isDirty()) {
                    $expense->save();
                    $changed++;
                }
            }
        });

        // Regras e memória na hora; o que sobrar fica pendente para a IA (próxima sincronização
        // ou o botão "Categorizar com IA").
        $this->categorizer->applyLocal($pending);

        return $changed;
    }
}
