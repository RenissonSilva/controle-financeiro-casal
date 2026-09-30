<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

class Setting extends Model
{
    protected $fillable = [
        'payer1_name',
        'payer2_name',
        'payer1_salary',
        'payer2_salary',
        'card_closing_day',
        'income_grace_days',
    ];

    protected $casts = [
        'payer1_salary'              => 'float',
        'payer2_salary'              => 'float',
        'card_closing_day'           => 'integer',
        'income_grace_days'          => 'integer',
    ];

    // Instância "scoped" no container: reaproveitada dentro de uma requisição/job (é lida a
    // cada lançamento salvo, no cálculo da competência) e descartada entre jobs da fila.
    public const CONTAINER_KEY = 'settings.current';

    protected static function booted(): void
    {
        static::saved(fn () => app()->forgetInstance(self::CONTAINER_KEY));
        static::deleted(fn () => app()->forgetInstance(self::CONTAINER_KEY));
    }

    // Retorna o registro único de configurações, criando um padrão se não existir.
    public static function current(): self
    {
        return app(self::CONTAINER_KEY);
    }

    public static function resolveCurrent(): self
    {
        return self::firstOrCreate([], [
            'payer1_name'      => 'Pagador 1',
            'payer2_name'      => 'Pagador 2',
            'payer1_salary'    => 0,
            'payer2_salary'    => 0,
            'card_closing_day' => 5,
        ]);
    }

    /**
     * Mês financeiro de um lançamento. Compra de cartão com fatura conhecida vai para o ciclo
     * que mais se sobrepõe ao período da fatura (15 dias antes do fechamento real — cai no
     * meio da fatura mesmo quando o banco fecha 1 ou 2 dias antes/depois do dia configurado).
     * Sem fatura, vale a data do lançamento — exceto receita que chega poucos dias antes do
     * ciclo começar (salário adiantado), que conta no ciclo seguinte.
     */
    public function competenceFor(
        \DateTimeInterface|string $date,
        \DateTimeInterface|string|null $billClosingDate = null,
        \DateTimeInterface|string|null $billDueDate = null,
        ?string $kind = null,
    ): string {
        if ($kind === Expense::KIND_INCOME && $this->income_grace_days > 0) {
            return $this->billingCycleForDate(Carbon::parse($date)->addDays($this->income_grace_days));
        }

        if ($billClosingDate) {
            return $this->billingCycleForDate(Carbon::parse($billClosingDate)->subDays(15));
        }

        if ($billDueDate) {
            // Sem data de fechamento: o fechamento costuma ser ~7 dias antes do vencimento.
            return $this->billingCycleForDate(Carbon::parse($billDueDate)->subDays(22));
        }

        return $this->billingCycleForDate($date);
    }

    /**
     * Retorna a competência (Y-m) à qual uma data pertence, considerando o
     * ciclo de fatura do cartão. Ex: fechamento=5, data=03/08 → competência "2026-07",
     * pois o ciclo "07" vai de 05/07 até 04/08.
     */
    public function billingCycleForDate(\DateTimeInterface|string $date): string
    {
        $date  = Carbon::parse($date);
        $cycle = $date->day >= $this->card_closing_day ? $date->copy() : $date->copy()->subMonthNoOverflow();

        return $cycle->format('Y-m');
    }

    /**
     * Retorna o intervalo [início, fim] de datas cobertas pela competência (Y-m) informada.
     *
     * @return array{0: Carbon, 1: Carbon}
     */
    public function billingCycleRange(string $month): array
    {
        $start = Carbon::createFromFormat('Y-m-d', "{$month}-01")->day($this->card_closing_day)->startOfDay();
        $end   = $start->copy()->addMonthNoOverflow()->subDay()->endOfDay();

        return [$start, $end];
    }

    public function currentCycle(): string
    {
        return $this->billingCycleForDate(Carbon::today());
    }

    public static function shiftCycle(string $month, int $months): string
    {
        return Carbon::createFromFormat('Y-m-d', "{$month}-01")->addMonthsNoOverflow($months)->format('Y-m');
    }

    // Proporção exata do pagador 1 (0..1), sem arredondar — o arredondamento só entra
    // no valor final em R$, para não acumular erro (ver splitShared).
    public function payer1Ratio(): float
    {
        $total = $this->payer1_salary + $this->payer2_salary;

        return $total > 0 ? $this->payer1_salary / $total : 0.5;
    }

    /**
     * Divide um valor compartilhado pela proporção de renda. A parte do pagador 2 é o
     * resto, então as duas partes sempre somam exatamente o valor original.
     *
     * @return array{0: float, 1: float}
     */
    public function splitShared(float $amount): array
    {
        $payer1 = round($amount * $this->payer1Ratio(), 2);

        return [$payer1, round($amount - $payer1, 2)];
    }

    // Percentuais só para exibição.
    public function getPayer1PercentAttribute(): float
    {
        return round($this->payer1Ratio() * 100, 2);
    }

    public function getPayer2PercentAttribute(): float
    {
        return round(100 - $this->payer1Ratio() * 100, 2);
    }

    public function payerName(string $payer): string
    {
        return $payer === 'payer2' ? $this->payer2_name : $this->payer1_name;
    }
}
