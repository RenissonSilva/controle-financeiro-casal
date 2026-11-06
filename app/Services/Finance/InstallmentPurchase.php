<?php

namespace App\Services\Finance;

use App\Models\Expense;
use App\Models\Setting;
use App\Services\Categorization\Categorizer;
use Illuminate\Support\Collection;

/**
 * Compra parcelada no cartão. O Pluggy manda cada parcela como uma transação solta (com
 * installment_number/installment_total) e sem um id da compra, então as parcelas da mesma compra
 * são reconhecidas por: mesma conta, mesmo nome (sem o "3/6"), mesmo número de parcelas, mesmo
 * mês da 1ª parcela (mês da parcela − número + 1) e valor parecido (as parcelas diferem no
 * máximo alguns centavos, do arredondamento).
 */
final class InstallmentPurchase
{
    public static function isInstallment(Expense $expense): bool
    {
        return $expense->kind === Expense::KIND_EXPENSE
            && $expense->direction === 'out'
            && $expense->installment_total > 1
            && $expense->installment_number >= 1
            && $expense->installment_number <= $expense->installment_total
            && filled($expense->competence);
    }

    /**
     * Parcelas da mesma compra (inclusive a própria), em ordem; vazio se não for parcela.
     *
     * @return Collection<int, Expense>
     */
    public static function of(Expense $expense): Collection
    {
        if (! self::isInstallment($expense)) {
            return collect();
        }

        return self::pick($expense, self::candidates(collect([$expense])));
    }

    /**
     * Mesmo que of() para várias linhas de uma vez (uma consulta só).
     *
     * @param  Collection<int, Expense>  $expenses
     * @return array<int, Collection<int, Expense>> id do lançamento → parcelas da compra
     */
    public static function groupsFor(Collection $expenses): array
    {
        $installments = $expenses->filter(fn (Expense $e) => self::isInstallment($e));

        if ($installments->isEmpty()) {
            return [];
        }

        $byKey = self::candidates($installments)->groupBy(fn (Expense $e) => self::key($e));

        return $installments
            ->mapWithKeys(fn (Expense $e) => [$e->id => self::pick($e, $byKey->get(self::key($e), collect()))])
            ->all();
    }

    /**
     * Divide a compra toda: `$payer1Total` é a parte do pagador 1 no total da compra e cada
     * parcela fica com a mesma proporção, arredondada para as partes somarem exatamente o
     * informado. Parcela que ainda não chegou do banco entra com o valor desta, como estimativa.
     *
     * @param  Collection<int, Expense>  $installments
     * @return array{total: float, shares: array<int, float>} shares: número da parcela → parte do pagador 1
     */
    public static function plan(Collection $installments, Expense $reference, float $payer1Total): array
    {
        $amounts = [];

        for ($number = 1; $number <= $reference->installment_total; $number++) {
            $amounts[$number] = (float) ($installments->firstWhere('installment_number', $number)?->amount ?? $reference->amount);
        }

        $total = round(array_sum($amounts), 2);
        $ratio = $total > 0 ? $payer1Total / $total : 0;

        return [
            'total' => $total,
            'shares' => Money::distribute(array_map(fn (float $amount) => $amount * $ratio, $amounts), $payer1Total),
        ];
    }

    /**
     * Parcela que chegou agora (ex: a do mês, que o Pluggy tira e devolve com outro id) segue a
     * divisão definida à mão nas outras parcelas da mesma compra.
     *
     * @param  Collection<int, Expense>  $created
     */
    public static function inheritSplits(Collection $created): int
    {
        $count = 0;

        foreach (self::groupsFor($created) as $id => $installments) {
            $expense = $installments->firstWhere('id', $id);

            if (! $expense || $expense->hasCustomSplit()) {
                continue;
            }

            $model = $installments
                ->filter(fn (Expense $other) => $other->id !== $id && $other->hasCustomSplit() && $other->amount > 0)
                ->sortBy(fn (Expense $other) => abs($other->installment_number - $expense->installment_number))
                ->first();

            if (! $model) {
                continue;
            }

            $expense->update([
                'ownership' => 'both',
                'payer1_share' => round($expense->amount * $model->payer1_share / $model->amount, 2),
                'category_id' => $expense->category_id ?? $model->category_id,
                'category_source' => 'user',
                'status' => 'categorized',
            ]);
            $count++;
        }

        return $count;
    }

    private static function key(Expense $expense): string
    {
        return implode('|', [
            $expense->account_id,
            $expense->installment_total,
            Categorizer::memoryKey($expense),
            Setting::shiftCycle($expense->competence, 1 - $expense->installment_number),
        ]);
    }

    // As parcelas diferem no máximo alguns centavos (a 1ª costuma levar o resto da divisão).
    private static function sameAmount(Expense $a, Expense $b): bool
    {
        return abs($a->amount - $b->amount) <= 0.01 * $a->installment_total + 0.01;
    }

    /** @param  Collection<int, Expense>  $installments */
    private static function candidates(Collection $installments): Collection
    {
        $accounts = $installments->pluck('account_id')->unique();

        return Expense::query()
            ->where('kind', Expense::KIND_EXPENSE)
            ->where('direction', 'out')
            ->whereIn('installment_total', $installments->pluck('installment_total')->unique()->values())
            ->where(function ($query) use ($accounts) {
                $query->whereIn('account_id', $accounts->filter()->values());

                if ($accounts->contains(null)) {
                    $query->orWhereNull('account_id');
                }
            })
            ->get();
    }

    /**
     * Fica com as candidatas da mesma compra; se o banco mandou duas com o mesmo número, a de
     * valor mais próximo (ou a própria).
     *
     * @param  Collection<int, Expense>  $candidates
     * @return Collection<int, Expense>
     */
    private static function pick(Expense $expense, Collection $candidates): Collection
    {
        $key = self::key($expense);

        return $candidates
            ->filter(fn (Expense $c) => self::isInstallment($c) && self::key($c) === $key && self::sameAmount($expense, $c))
            ->groupBy('installment_number')
            ->map(fn (Collection $same) => $same->firstWhere('id', $expense->id) ?? $same->sortBy(fn (Expense $c) => abs($c->amount - $expense->amount))->first())
            ->sortKeys()
            ->values();
    }
}
