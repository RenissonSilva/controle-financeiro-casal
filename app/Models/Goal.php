<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Goal extends Model
{
    protected $fillable = ['name', 'target_amount', 'deadline', 'tracking', 'manual_amount', 'is_primary'];

    protected $casts = [
        'target_amount' => 'float',
        'manual_amount' => 'float',
        'deadline' => 'date',
        'is_primary' => 'boolean',
    ];

    /**
     * Quanto já foi juntado. Metas 'investments' usam o saldo investido conectado
     * (o mesmo valor para todas elas); 'manual' usa o valor informado.
     */
    public function currentAmount(float $investedBalance): float
    {
        return $this->tracking === 'investments' ? $investedBalance : $this->manual_amount;
    }

    public function progressPercent(float $investedBalance): float
    {
        if ($this->target_amount <= 0) {
            return 0;
        }

        return min(100, round($this->currentAmount($investedBalance) / $this->target_amount * 100, 1));
    }
}
