<?php

namespace App\Services\Finance;

use App\Models\Expense;
use App\Models\OpenFinanceAccount;
use App\Models\OpenFinanceInvestment;
use App\Models\Setting;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Saldo total (contas + investimentos conectados) e sua evolução.
 *
 * O Pluggy só informa o saldo de hoje; o histórico é reconstruído de trás para frente:
 * saldo no fim do dia D = saldo de hoje − tudo que entrou/saiu das contas depois de D.
 * Aplicação/resgate não entram (o dinheiro só troca de lugar dentro do total). Rendimento
 * dos investimentos não é conhecido dia a dia, então o passado fica levemente superestimado.
 */
class BalanceHistory
{
    private ?array $current = null;
    private ?Collection $flows = null;

    public function __construct(private readonly Setting $settings) {}

    public function hasData(): bool
    {
        return OpenFinanceAccount::where('type', 'BANK')->exists() || OpenFinanceInvestment::exists();
    }

    /** @return array{accounts: float, investments: float, total: float} */
    public function current(): array
    {
        if ($this->current !== null) {
            return $this->current;
        }

        $accounts = (float) OpenFinanceAccount::where('type', 'BANK')->sum('balance');
        $investments = (float) OpenFinanceInvestment::sum('balance');

        return $this->current = [
            'accounts' => round($accounts, 2),
            'investments' => round($investments, 2),
            'total' => round($accounts + $investments, 2),
        ];
    }

    public function totalAt(Carbon $endOfDay): float
    {
        $day = $endOfDay->toDateString();
        $flowsAfter = $this->bankFlows()->filter(fn (array $flow) => $flow['date'] > $day)->sum('value');

        return round($this->current()['total'] - $flowsAfter, 2);
    }

    /**
     * Saldo no fim de cada um dos últimos N ciclos + hoje, e a variação de hoje contra o
     * fim do ciclo anterior.
     */
    public function summary(int $cycles = 8): array
    {
        $current = $this->current();
        $currentCycle = $this->settings->currentCycle();
        $points = [];

        for ($i = $cycles; $i >= 1; $i--) {
            $month = Setting::shiftCycle($currentCycle, -$i);
            [, $end] = $this->settings->billingCycleRange($month);
            $points[] = ['month' => $month, 'total' => $this->totalAt($end)];
        }

        $points[] = ['month' => $currentCycle, 'total' => $current['total']];
        $previous = $points[count($points) - 2]['total'] ?? null;

        return [
            ...$current,
            'previous_total' => $previous,
            'change' => $previous !== null ? round($current['total'] - $previous, 2) : null,
            'change_percent' => $previous !== null && abs($previous) >= 1 ? round(($current['total'] - $previous) / abs($previous) * 100, 1) : null,
            'previous_month' => Setting::shiftCycle($currentCycle, -1),
            'points' => $points,
        ];
    }

    // Movimentações das contas conectadas (entrada +, saída −), menos aplicação/resgate.
    private function bankFlows(): Collection
    {
        return $this->flows ??= Expense::query()
            ->where('origin', 'open_finance')
            ->where('account_type', 'BANK')
            ->where(fn ($q) => $q->whereNull('kind_reason')->orWhere('kind_reason', '!=', 'investment'))
            ->get(['amount', 'direction', 'date'])
            ->map(fn (Expense $e) => [
                'date' => $e->date->toDateString(),
                'value' => $e->direction === 'in' ? $e->amount : -$e->amount,
            ]);
    }
}
