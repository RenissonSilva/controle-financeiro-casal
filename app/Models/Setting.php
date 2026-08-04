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
    ];

    protected $casts = [
        'payer1_salary'    => 'float',
        'payer2_salary'    => 'float',
        'card_closing_day' => 'integer',
    ];

    // Retorna o registro único de configurações, criando um padrão se não existir.
    public static function current(): self
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
     * Retorna a competência (Y-m) à qual uma data pertence, considerando o
     * ciclo de fatura do cartão. Ex: fechamento=5, data=03/08 → competência "2026-07",
     * pois o ciclo "07" vai de 05/07 até 04/08.
     */
    public function billingCycleForDate(\DateTimeInterface|string $date): string
    {
        $date  = Carbon::parse($date);
        $cycle = $date->day >= $this->card_closing_day ? $date->copy() : $date->copy()->subMonth();

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
        $end   = $start->copy()->addMonth()->subDay()->endOfDay();

        return [$start, $end];
    }

    public function getPayer1PercentAttribute(): float
    {
        $total = $this->payer1_salary + $this->payer2_salary;
        return $total > 0 ? round($this->payer1_salary / $total * 100, 2) : 50.0;
    }

    public function getPayer2PercentAttribute(): float
    {
        return round(100 - $this->payer1_percent, 2);
    }
}
