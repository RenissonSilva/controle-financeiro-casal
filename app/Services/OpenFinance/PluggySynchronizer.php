<?php

namespace App\Services\OpenFinance;

use App\Models\CategorizationRule;
use App\Models\Expense;
use App\Models\NameRule;
use App\Models\OpenFinanceAccount;
use App\Models\OpenFinanceInvestment;
use App\Models\OpenFinanceItem;
use App\Services\Categorization\Categorizer;
use App\Services\Finance\FixedExpenseMatcher;
use App\Services\PluggyService;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Sincroniza uma conexão do Pluggy com o banco local: contas (saldo/limite), investimentos
 * e todas as transações de cada conta.
 *
 * Busca o histórico completo a cada vez (poucas centenas de transações) em vez de só o que é
 * novo, porque o Pluggy altera transações já existentes — valor/data de compras pendentes
 * mudam e parcelas futuras ganham um id novo quando a fatura fecha. Transações que sumiram
 * do Pluggy são apagadas aqui (levando as edições do usuário para a substituta).
 */
class PluggySynchronizer
{
    public function __construct(
        private readonly PluggyService $pluggy,
        private readonly Categorizer $categorizer,
    ) {}

    /**
     * Regras e memória categorizam na hora; o que sobrar fica 'pending' e quem chamou decide
     * quando chamar a IA (Categorizer::applyAi) — `pending_ids` no retorno.
     *
     * @return array{created: int, updated: int, removed: int, accounts: int, pending_ids: list<int>}
     */
    public function sync(OpenFinanceItem $item): array
    {
        $remote = $this->pluggy->getItem($item->item_id);

        $item->fill([
            'status' => $remote['status'] ?? $item->status,
            'connector_name' => $item->connector_name ?: ($remote['connector']['name'] ?? null),
        ]);

        $accounts = $this->pluggy->getAccounts($item->item_id);
        $transactionsByAccount = collect($accounts)->mapWithKeys(
            fn (array $account) => [$account['id'] => $this->pluggy->getTransactions($account['id'])]
        );
        $billsByAccount = collect($accounts)
            ->filter(fn (array $account) => ($account['type'] ?? null) === 'CREDIT')
            ->mapWithKeys(fn (array $account) => [$account['id'] => TransactionClassifier::billDates($this->safeBills($account['id']))]);

        $item->owner_document ??= $this->ownerDocument($item, $transactionsByAccount);
        $item->save();

        $classifier = new TransactionClassifier($item->owner_document);
        $rules = CategorizationRule::all();
        $stats = ['created' => 0, 'updated' => 0, 'removed' => 0, 'accounts' => count($accounts), 'pending_ids' => []];
        $touched = collect();

        DB::transaction(function () use ($item, $accounts, $transactionsByAccount, $billsByAccount, $classifier, $rules, &$stats, &$touched) {
            $created = collect();

            foreach ($accounts as $account) {
                $this->upsertAccount($item, $account);

                $result = $this->syncAccount(
                    $item,
                    $account,
                    $transactionsByAccount[$account['id']],
                    $billsByAccount->get($account['id'], []),
                    $classifier,
                    $rules,
                );
                $stats['created'] += $result['created']->count();
                $stats['updated'] += $result['updated'];
                $stats['removed'] += $result['removed'];
                $touched = $touched->merge($result['dates']);
                $created = $created->merge($result['created']);
            }

            // Linhas antigas (antes de guardarmos a conta de origem) que não existem mais no Pluggy.
            $all = $transactionsByAccount->flatten(1);

            if ($all->isNotEmpty()) {
                $stats['removed'] += $this->removeStale(
                    Expense::where('open_finance_item_id', $item->id)->whereNull('account_id'),
                    $all->pluck('id'),
                    self::oldestLocalDate($all),
                    $created,
                );
            }

            // Cobrança nova que bate com uma regra de nome (ex: "Amazon %") já chega com o nome dela.
            NameRule::apply($created->pluck('id'));
        });

        $this->syncInvestments($item);

        // Categoriza o que ficou pendente com regras e memória (sem chamada externa).
        $pending = Expense::where('open_finance_item_id', $item->id)->where('status', 'pending')->pluck('id');
        $this->categorizer->applyLocal($pending);

        if ($touched->isNotEmpty()) {
            FixedExpenseMatcher::make()->matchBetween(Carbon::parse($touched->min()), Carbon::parse($touched->max()));
        }

        $stats['pending_ids'] = Expense::whereIn('id', $pending)->where('status', 'pending')->pluck('id')->all();

        $item->update(['last_synced_at' => now(), 'last_sync_error' => null]);

        return $stats;
    }

    /**
     * @return array{created: Collection<int, Expense>, updated: int, removed: int, dates: Collection<int, string>}
     */
    private function syncAccount(OpenFinanceItem $item, array $account, array $transactions, array $bills, TransactionClassifier $classifier, Collection $rules): array
    {
        $accountType = ($account['type'] ?? 'BANK') === 'CREDIT' ? 'CREDIT' : 'BANK';
        $ids = collect($transactions)->pluck('id');
        $existing = Expense::whereIn('external_id', $ids)->get()->keyBy('external_id');
        $created = collect();
        $updated = 0;
        $dates = collect();

        foreach ($transactions as $transaction) {
            $bank = $classifier->bankAttributes($transaction, $accountType, $bills) + [
                'origin' => 'open_finance',
                'open_finance_item_id' => $item->id,
                'account_id' => $account['id'],
                'source' => $item->owner,
            ];

            $expense = $existing->get($transaction['id']);

            if (! $expense) {
                $class = $classifier->classify($bank, $rules);
                $created->push(Expense::create($bank + $class + [
                    'external_id' => $transaction['id'],
                    'ownership' => 'both',
                    'status' => $class['kind'] === Expense::KIND_EXPENSE ? 'pending' : 'categorized',
                ]));
                $dates->push($bank['date']);
                continue;
            }

            $expense->fill($bank);

            if (! $expense->kind_locked) {
                $expense->fill($classifier->classify($bank, $rules));

                // Virou despesa agora (ex: regra de "ignorar" removida) e nunca foi categorizada.
                if ($expense->isDirty('kind') && $expense->kind === Expense::KIND_EXPENSE && ! $expense->category_id && $expense->category_source !== 'user') {
                    $expense->status = 'pending';
                }
            }

            if ($expense->isDirty()) {
                $expense->save();
                $updated++;
                $dates->push($bank['date']);
            }
        }

        $removed = $transactions
            ? $this->removeStale(Expense::where('account_id', $account['id']), $ids, self::oldestLocalDate(collect($transactions)), $created)
            : 0;

        return ['created' => $created, 'updated' => $updated, 'removed' => $removed, 'dates' => $dates];
    }

    // Início da janela confiável: a compra mais antiga devolvida (no fuso do app) + 2 dias, porque
    // no cartão o lançamento pode entrar na fatura até 2 dias depois da compra — os primeiros
    // dias da janela podem ter lançamentos de compras anteriores a ela.
    private static function oldestLocalDate(Collection $transactions): string
    {
        return Carbon::parse($transactions->min('date'))->setTimezone(config('app.timezone'))->addDays(2)->toDateString();
    }

    /**
     * Apaga lançamentos que o Pluggy não devolve mais (dentro da janela de datas que ele
     * devolveu) — tipicamente parcelas futuras que ganharam id novo quando a fatura fechou.
     * Edições do usuário vão para a transação substituta, se houver.
     *
     * @param  Collection<int, Expense>  $replacements
     */
    private function removeStale($query, Collection $currentIds, string $oldestDate, Collection $replacements): int
    {
        $stale = $query->whereNotIn('external_id', $currentIds)->where('date', '>=', $oldestDate)->get();

        foreach ($stale as $expense) {
            $this->carryOverEdits($expense, $replacements);
            $expense->delete();
        }

        return $stale->count();
    }

    private function carryOverEdits(Expense $old, Collection $replacements): void
    {
        $hasEdits = $old->category_source === 'user' || $old->kind_locked || filled($old->notes);

        if (! $hasEdits) {
            return;
        }

        $key = Categorizer::memoryKey($old);

        $replacement = $replacements
            ->filter(fn (Expense $new) => $new->account_id === $old->account_id || $old->account_id === null)
            ->filter(fn (Expense $new) => Categorizer::memoryKey($new) === $key)
            ->filter(fn (Expense $new) => $new->installment_number === $old->installment_number)
            ->filter(fn (Expense $new) => abs($new->amount - $old->amount) < 0.02)
            ->sortBy(fn (Expense $new) => abs($new->date->diffInDays($old->date)))
            ->first();

        if (! $replacement || $replacement->date->diffInDays($old->date, true) > 45) {
            return;
        }

        $replacement->update(array_filter([
            'category_id' => $old->category_source === 'user' ? $old->category_id : null,
            'ownership' => $old->category_source === 'user' ? $old->ownership : null,
            'ownership_scope' => $old->ownership_scope,
            'category_source' => $old->category_source === 'user' ? 'user' : null,
            'status' => $old->category_source === 'user' ? 'categorized' : null,
            'notes' => $old->notes,
            'kind' => $old->kind_locked ? $old->kind : null,
            'kind_reason' => $old->kind_locked ? $old->kind_reason : null,
            'kind_locked' => $old->kind_locked ?: null,
        ], fn ($value) => $value !== null));
    }

    private function upsertAccount(OpenFinanceItem $item, array $account): void
    {
        $credit = $account['creditData'] ?? [];

        OpenFinanceAccount::updateOrCreate(
            ['external_id' => $account['id']],
            [
                'open_finance_item_id' => $item->id,
                'type' => ($account['type'] ?? 'BANK') === 'CREDIT' ? 'CREDIT' : 'BANK',
                'subtype' => $account['subtype'] ?? null,
                'name' => $account['marketingName'] ?? $account['name'] ?? null,
                'number' => $account['number'] ?? null,
                'balance' => (float) ($account['balance'] ?? 0),
                'currency_code' => $account['currencyCode'] ?? 'BRL',
                'credit_limit' => $credit['creditLimit'] ?? null,
                'available_credit_limit' => $credit['availableCreditLimit'] ?? null,
                'bill_due_date' => isset($credit['balanceDueDate']) ? Carbon::parse($credit['balanceDueDate'])->toDateString() : null,
                'minimum_payment' => $credit['minimumPayment'] ?? null,
            ]
        );
    }

    // Sem faturas (conector que não oferece o produto), as compras usam a data para o mês.
    private function safeBills(string $accountId): array
    {
        try {
            return $this->pluggy->getBills($accountId);
        } catch (\Throwable) {
            return [];
        }
    }

    private function syncInvestments(OpenFinanceItem $item): void
    {
        try {
            $investments = $this->pluggy->getInvestments($item->item_id);
        } catch (\Throwable) {
            return; // conector sem o produto de investimentos
        }

        foreach ($investments as $investment) {
            OpenFinanceInvestment::updateOrCreate(
                ['external_id' => $investment['id']],
                [
                    'open_finance_item_id' => $item->id,
                    'type' => $investment['type'] ?? null,
                    'subtype' => $investment['subtype'] ?? null,
                    'name' => $investment['name'] ?? null,
                    'balance' => (float) ($investment['balance'] ?? 0),
                    'status' => $investment['status'] ?? null,
                ]
            );
        }

        $item->investments()->whereNotIn('external_id', collect($investments)->pluck('id'))->delete();
    }

    /**
     * CPF/CNPJ do titular: pelo produto Identity do Pluggy ou, na falta dele, pelo documento
     * que aparece como pagador nas transferências enviadas da conta.
     */
    private function ownerDocument(OpenFinanceItem $item, Collection $transactionsByAccount): ?string
    {
        try {
            $identity = $this->pluggy->getIdentity($item->item_id);
        } catch (\Throwable) {
            $identity = null;
        }

        $document = preg_replace('/\D/', '', (string) ($identity['document'] ?? ''));

        if ($document !== '') {
            return $document;
        }

        return $transactionsByAccount->flatten(1)
            ->filter(fn (array $t) => ($t['type'] ?? null) === 'DEBIT')
            ->map(fn (array $t) => preg_replace('/\D/', '', (string) ($t['paymentData']['payer']['documentNumber']['value'] ?? '')))
            ->filter()
            ->countBy()
            ->sortDesc()
            ->keys()
            ->first();
    }
}
