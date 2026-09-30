<?php

namespace App\Services\Finance;

use App\Models\Expense;
use App\Models\FixedExpense;
use App\Models\Setting;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Todos os números de um mês financeiro (ciclo do cartão), num lugar só — Home,
 * Lançamentos e PDF leem daqui para nunca divergirem.
 *
 * Convenções:
 * - Só lançamentos `kind = expense` são despesa; estorno (direction 'in') abate.
 * - Receita = `kind = income` das contas do pagador 1 (quem usa o sistema).
 * - "Parte de cada um" = gastos individuais + fatia dos compartilhados pela renda,
 *   com as duas fatias somando exatamente o total compartilhado.
 */
class CycleReport
{
    public readonly Carbon $start;
    public readonly Carbon $end;

    private ?Collection $rows = null;
    private ?Collection $fixed = null;
    private ?Collection $settlementFixed = null;

    public function __construct(public readonly Setting $settings, public readonly string $month)
    {
        [$this->start, $this->end] = $settings->billingCycleRange($month);
    }

    public static function for(string $month, ?Setting $settings = null): self
    {
        return new self($settings ?? Setting::current(), $month);
    }

    /** @return Collection<int, Expense> */
    public function rows(): Collection
    {
        return $this->rows ??= Expense::with('category')
            ->inCompetence($this->month)
            ->newestFirst()
            ->get();
    }

    /** @return Collection<int, Expense> */
    public function expenses(): Collection
    {
        return $this->rows()->where('kind', Expense::KIND_EXPENSE)->values();
    }

    /**
     * Total do casal e quanto cabe a cada um.
     */
    public function split(): array
    {
        $sum = fn (string $ownership) => round($this->expenses()->where('ownership', $ownership)->sum(fn (Expense $e) => $e->expenseAmount()), 2);

        $payer1 = $sum('payer1');
        $payer2 = $sum('payer2');
        $shared = $sum('both');
        [$payer1Shared, $payer2Shared] = $this->settings->splitShared($shared);

        return [
            'total' => round($payer1 + $payer2 + $shared, 2),
            'payer1_individual' => $payer1,
            'payer2_individual' => $payer2,
            'shared_total' => $shared,
            'payer1_shared' => $payer1Shared,
            'payer2_shared' => $payer2Shared,
            'payer1_total' => round($payer1 + $payer1Shared, 2),
            'payer2_total' => round($payer2 + $payer2Shared, 2),
        ];
    }

    // Receitas do pagador 1 no ciclo (salário etc.). Pix do parceiro é acerto, não receita.
    public function income(): float
    {
        return round($this->rows()
            ->where('kind', Expense::KIND_INCOME)
            ->where('source', 'payer1')
            ->sum(fn (Expense $e) => $e->incomeAmount()), 2);
    }

    /**
     * Despesas por categoria. Perspectiva 'couple' = total do casal; 'payer1'/'payer2' = só a
     * parte daquela pessoa (os valores somam exatamente o total da pessoa no split()).
     *
     * @return list<array{name: string, color: string, value: float}>
     */
    public function byCategory(string $perspective = 'couple'): array
    {
        $ratio = $this->settings->payer1Ratio();

        $groups = $this->expenses()
            ->groupBy(fn (Expense $e) => $e->category_id ?? 0)
            ->map(function (Collection $group) use ($perspective, $ratio) {
                $first = $group->first();

                $value = $group->sum(function (Expense $e) use ($perspective, $ratio) {
                    $amount = $e->expenseAmount();

                    return match ($perspective) {
                        'payer1' => match ($e->ownership) {
                            'payer1' => $amount,
                            'both' => $amount * $ratio,
                            default => 0,
                        },
                        'payer2' => match ($e->ownership) {
                            'payer2' => $amount,
                            'both' => $amount * (1 - $ratio),
                            default => 0,
                        },
                        default => $amount,
                    };
                });

                return [
                    'name' => $first->category?->name ?? 'Sem categoria',
                    'color' => $first->category?->color ?? '#94a3b8',
                    'value' => $value,
                ];
            });

        $split = $this->split();
        $target = match ($perspective) {
            'payer1' => $split['payer1_total'],
            'payer2' => $split['payer2_total'],
            default => $split['total'],
        };

        $rounded = Money::distribute($groups->pluck('value')->all(), $target);

        return $groups->values()
            ->map(fn (array $group, int $index) => [...$group, 'value' => $rounded[$index]])
            ->filter(fn (array $group) => abs($group['value']) >= 0.01)
            ->sortByDesc('value')
            ->values()
            ->all();
    }

    /** Contas fixas do ciclo com status de pagamento (paid/upcoming/late). */
    public function fixedExpenses(): Collection
    {
        return $this->fixed ??= FixedExpense::projectForCycle($this->start, $this->end);
    }

    // Quanto de uma conta fixa cabe a uma pessoa (mesma regra de divisão das despesas).
    public function shareOf(float $amount, string $ownership, string $payer): float
    {
        if ($ownership === 'both') {
            [$payer1, $payer2] = $this->settings->splitShared($amount);

            return $payer === 'payer1' ? $payer1 : $payer2;
        }

        return $ownership === $payer ? $amount : 0.0;
    }

    /**
     * Contas fixas ainda não pagas neste ciclo (a parte que ainda vai sair).
     */
    public function pendingFixed(?string $payer = null): float
    {
        return round($this->fixedExpenses()
            ->where('status', '!=', 'paid')
            ->sum(fn (array $item) => $payer ? $this->shareOf($item['amount'], $item['ownership'], $payer) : $item['amount']), 2);
    }

    /**
     * Quanto o pagador 2 deve ao pagador 1 neste ciclo (positivo = pagador 2 deve): a parte do
     * pagador 2 no que o pagador 1 pagou e nas contas fixas do próximo ciclo, menos a parte do
     * pagador 1 no que o pagador 2 pagou. Pix trocados entre os dois não entram.
     */
    public function settlementDue(): float
    {
        $expenses = $this->settlementExpenses();
        $sum = fn (string $source, string $ownership) => round($expenses
            ->where('source', $source)
            ->where('ownership', $ownership)
            ->sum(fn (Expense $e) => $e->expenseAmount()), 2);

        // Parte do pagador 2 no que o pagador 1 pagou.
        $owedToPayer1 = $sum('payer1', 'payer2') + $this->settings->splitShared($sum('payer1', 'both'))[1];
        // Parte do pagador 1 no que o pagador 2 pagou.
        $owedToPayer2 = $sum('payer2', 'payer1') + $this->settings->splitShared($sum('payer2', 'both'))[0];

        return round($owedToPayer1 + $this->settlementFixed()->sum('payer2_share') - $owedToPayer2, 2);
    }

    /**
     * Contas fixas que o acerto deste ciclo cobre: as do ciclo seguinte, porque o acerto do fim do
     * mês é o dinheiro das contas do começo do próximo. Paga = valor real; em aberto = valor
     * ajustado do mês ou a estimativa. Quem paga as contas fixas é o pagador 1.
     *
     * @return Collection<int, array> itens de FixedExpense::projectForCycle() + `payer2_share`
     */
    public function settlementFixed(): Collection
    {
        return $this->settlementFixed ??= self::for(Setting::shiftCycle($this->month, 1), $this->settings)
            ->fixedExpenses()
            ->where('ownership', '!=', 'payer1')
            ->map(fn (array $item) => [...$item, 'payer2_share' => $this->shareOf($item['amount'], $item['ownership'], 'payer2')])
            ->values();
    }

    // Despesas que entram no acerto: todas menos o pagamento das contas fixas deste ciclo, que já
    // foram cobertas pelo acerto do ciclo anterior (ver settlementFixed()).
    private function settlementExpenses(): Collection
    {
        return $this->expenses()
            ->loadMissing('fixedOccurrence')
            ->filter(fn (Expense $e) => $e->fixedOccurrence === null)
            ->values();
    }

    /**
     * Despesas do acerto que envolvem o pagador 2 (dele ou compartilhadas) ou que ele pagou, com a
     * parte de cada um e quanto cada uma move o acerto (positivo = pagador 2 passa a dever mais).
     * A soma dos `impact` mais o `payer2_share` de settlementFixed() bate exatamente com
     * settlementDue().
     *
     * @return Collection<int, array{expense: Expense, payer1_share: float, payer2_share: float, impact: float}>
     */
    public function settlementLines(): Collection
    {
        $ratio = $this->settings->payer1Ratio();
        $expenses = $this->settlementExpenses()
            ->filter(fn (Expense $e) => $e->ownership !== 'payer1' || $e->source === 'payer2')
            ->values();

        // Parte do pagador 1 em cada compartilhado, arredondada por quem pagou para somar o
        // mesmo que a divisão do total feita no settlementDue().
        $payer1Shares = [];
        foreach (['payer1', 'payer2'] as $source) {
            $shared = $expenses->where('source', $source)->where('ownership', 'both');

            if ($shared->isNotEmpty()) {
                $total = round($shared->sum(fn (Expense $e) => $e->expenseAmount()), 2);
                $payer1Shares += Money::distribute(
                    $shared->mapWithKeys(fn (Expense $e) => [$e->id => $e->expenseAmount() * $ratio])->all(),
                    $this->settings->splitShared($total)[0],
                );
            }
        }

        return $expenses->map(function (Expense $e) use ($payer1Shares) {
            $amount = $e->expenseAmount();
            $payer1Share = match ($e->ownership) {
                'payer1' => $amount,
                'both' => $payer1Shares[$e->id],
                default => 0.0,
            };
            $payer2Share = round($amount - $payer1Share, 2);

            return [
                'expense' => $e,
                'payer1_share' => $payer1Share,
                'payer2_share' => $payer2Share,
                'impact' => $e->source === 'payer2' ? -$payer1Share : $payer2Share,
            ];
        });
    }

    /**
     * Fluxo de caixa do ponto de vista do pagador 1: as receitas e a parte do pagador 1 nas despesas.
     */
    public function cashFlow(): array
    {
        $income = $this->income();
        $expenses = $this->split()['payer1_total'];
        $pendingFixed = $this->pendingFixed('payer1');

        return [
            'income' => $income,
            'expenses' => $expenses,
            'pending_fixed' => $pendingFixed,
            'balance' => round($income - $expenses, 2),
            'estimated_balance' => round($income - $expenses - $pendingFixed, 2),
        ];
    }

    public function label(): string
    {
        return ucfirst(Carbon::createFromFormat('Y-m-d', "{$this->month}-01")->locale('pt_BR')->translatedFormat('F \d\e Y'));
    }
}
