<?php

namespace App\Services\Chat;

use App\Models\CategorizationRule;
use App\Models\Expense;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Acha a cobrança que a pessoa descreveu no bot ("uber de ontem"): despesas compradas no
 * período cujo nome tem as palavras pedidas.
 */
class ExpenseFinder
{
    /**
     * Mais recentes primeiro. Primeiro exige todas as palavras; sem nenhuma assim, aceita
     * qualquer palavra de 4+ letras ("drogasil loja" acha "Drogasil 2345 Salvador").
     *
     * @param  list<string>  $words
     * @return Collection<int, Expense>
     */
    public function find(array $words, Carbon|string $from, Carbon|string $to, ?float $amount = null): Collection
    {
        if (! $words) {
            return collect();
        }

        $from = ($from instanceof Carbon ? $from->copy() : Carbon::parse($from))->startOfDay();
        $to = ($to instanceof Carbon ? $to->copy() : Carbon::parse($to))->endOfDay();

        $candidates = Expense::query()
            ->ofKind(Expense::KIND_EXPENSE)
            ->where('direction', 'out')
            // Dia da compra: no cartão `date` é o dia da fatura (até 2 dias depois); a compra está em occurred_at.
            ->where(fn (Builder $query) => $query
                ->whereBetween('occurred_at', [$from, $to])
                ->orWhere(fn (Builder $query) => $query->whereNull('occurred_at')->whereBetween('date', [$from->toDateString(), $to->toDateString()])))
            ->when($amount !== null, fn (Builder $query) => $query->whereBetween('amount', [$amount - 0.01, $amount + 0.01]))
            ->get()
            ->sortByDesc(fn (Expense $expense) => ($expense->occurred_at ?? $expense->date)->getTimestamp())
            ->values();

        $all = $candidates->filter(fn (Expense $expense) => $this->matches($expense, $words, all: true));

        if ($all->isNotEmpty()) {
            return $all->values();
        }

        $long = array_values(array_filter($words, fn (string $word) => strlen($word) >= 4));

        return $long
            ? $candidates->filter(fn (Expense $expense) => $this->matches($expense, $long, all: false))->values()
            : collect();
    }

    /** @param  list<string>  $words */
    private function matches(Expense $expense, array $words, bool $all): bool
    {
        $name = CategorizationRule::normalize(implode(' ', [$expense->custom_name, $expense->displayName(), $expense->counterparty_name]));
        $found = array_filter($words, fn (string $word) => str_contains($name, $word));

        return $all ? count($found) === count($words) : $found !== [];
    }
}
