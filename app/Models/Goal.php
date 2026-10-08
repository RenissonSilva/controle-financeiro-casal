<?php

namespace App\Models;

use App\Models\Concerns\RecordsActivity;
use Illuminate\Database\Eloquent\Model;

class Goal extends Model
{
    use RecordsActivity;

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

    // ---- Histórico de mudanças ----

    public function activityArea(): string
    {
        return 'goals';
    }

    public function activityNoun(): string
    {
        return 'a meta';
    }

    public function activityLabel(): string
    {
        return $this->name;
    }

    public function activityFields(): array
    {
        return [
            'name' => 'Nome',
            'target_amount' => ['Valor-alvo', 'money'],
            'deadline' => ['Prazo', 'date'],
            'tracking' => ['Progresso', 'tracking'],
            'manual_amount' => ['Já juntado', 'money'],
            'is_primary' => ['Aparece na Home', 'bool'],
        ];
    }
}
