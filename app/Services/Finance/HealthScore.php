<?php

namespace App\Services\Finance;

use App\Models\Expense;
use App\Models\OpenFinanceAccount;
use App\Models\Setting;
use Illuminate\Support\Carbon;

/**
 * "Saúde financeira" de 0 a 100, do ponto de vista do pagador 1:
 *
 * - 50% poupança: quanto da renda dos últimos 30 dias sobrou depois da parte do pagador 1 nas
 *   despesas (30% ou mais = nota cheia; zero ou negativo = zero).
 * - 30% reserva: saldo total ÷ gasto mensal médio dos 3 últimos ciclos fechados
 *   (6 meses ou mais = nota cheia).
 * - 20% cartão: uso do limite (até 30% = nota cheia; 90% ou mais = zero).
 *
 * Componente sem dado (ex: nenhum cartão conectado) sai da média e os pesos se redistribuem.
 */
class HealthScore
{
    private const WEIGHTS = ['savings' => 0.5, 'reserve' => 0.3, 'card' => 0.2];

    public function __construct(private readonly Setting $settings, private readonly BalanceHistory $balances) {}

    public function compute(): ?array
    {
        $parts = array_filter([
            'savings' => $this->savings(),
            'reserve' => $this->reserve(),
            'card' => $this->cardUsage(),
        ], fn ($part) => $part !== null);

        if (! isset($parts['savings']) && ! isset($parts['reserve'])) {
            return null;
        }

        $weight = array_sum(array_intersect_key(self::WEIGHTS, $parts));
        $score = (int) round(array_sum(array_map(
            fn (string $key) => $parts[$key]['score'] * self::WEIGHTS[$key],
            array_keys($parts),
        )) / $weight);

        [$label, $message] = match (true) {
            $score >= 80 => ['Excelente', 'Suas finanças estão saudáveis'],
            $score >= 60 => ['Boa', 'Suas finanças estão estáveis'],
            $score >= 40 => ['Atenção', 'Suas finanças pedem atenção'],
            default => ['Crítica', 'Suas finanças estão no limite'],
        };

        return ['score' => $score, 'label' => $label, 'message' => $message, 'parts' => $parts];
    }

    private function savings(): ?array
    {
        $from = Carbon::today()->subDays(29);
        $rows = Expense::whereIn('kind', [Expense::KIND_EXPENSE, Expense::KIND_INCOME])
            ->where('date', '>=', $from->toDateString())
            ->where('date', '<=', Carbon::today()->toDateString())
            ->get();

        $income = $rows->where('kind', Expense::KIND_INCOME)->where('source', 'payer1')->sum(fn (Expense $e) => $e->incomeAmount());
        $expenses = $this->payer1Share($rows->where('kind', Expense::KIND_EXPENSE));

        if ($income <= 0 && $expenses <= 0) {
            return null;
        }

        $rate = $income > 0 ? ($income - $expenses) / $income : -1;

        return [
            'score' => self::scale($rate, 0, 0.30),
            'rate' => round($rate * 100, 1),
            'income' => round($income, 2),
            'expenses' => round($expenses, 2),
        ];
    }

    private function reserve(): ?array
    {
        if (! $this->balances->hasData()) {
            return null;
        }

        $current = $this->settings->currentCycle();
        $lastThree = array_map(fn (int $i) => Setting::shiftCycle($current, -$i), [1, 2, 3]);

        $monthly = $this->payer1Share(Expense::where('kind', Expense::KIND_EXPENSE)->inCompetence(...$lastThree)->get()) / 3;

        if ($monthly <= 0) {
            return null;
        }

        $months = $this->balances->current()['total'] / $monthly;

        return ['score' => self::scale($months, 0, 6), 'months' => round($months, 1), 'monthly_expenses' => round($monthly, 2)];
    }

    private function cardUsage(): ?array
    {
        $cards = OpenFinanceAccount::where('type', 'CREDIT')->whereNotNull('credit_limit')->where('credit_limit', '>', 0)->get();

        if ($cards->isEmpty()) {
            return null;
        }

        $limit = $cards->sum('credit_limit');
        $used = $cards->sum(fn (OpenFinanceAccount $card) => $card->credit_limit - ($card->available_credit_limit ?? $card->credit_limit));
        $usage = $limit > 0 ? $used / $limit : 0;

        return ['score' => 100 - self::scale($usage, 0.30, 0.90), 'usage' => round($usage * 100, 1)];
    }

    private function payer1Share($expenses): float
    {
        $ratio = $this->settings->payer1Ratio();

        return $expenses->sum(fn (Expense $e) => match ($e->ownership) {
            'payer1' => $e->expenseAmount(),
            'both' => $e->expenseAmount() * $ratio,
            default => 0,
        });
    }

    // Converte um valor para 0..100 linearmente entre $min (0) e $max (100).
    private static function scale(float $value, float $min, float $max): int
    {
        return (int) round(max(0, min(1, ($value - $min) / ($max - $min))) * 100);
    }
}
