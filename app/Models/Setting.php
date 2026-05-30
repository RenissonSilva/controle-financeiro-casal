<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    protected $fillable = [
        'payer1_name',
        'payer2_name',
        'payer1_salary',
        'payer2_salary',
    ];

    protected $casts = [
        'payer1_salary' => 'float',
        'payer2_salary' => 'float',
    ];

    // Retorna o registro único de configurações, criando um padrão se não existir.
    public static function current(): self
    {
        return self::firstOrCreate([], [
            'payer1_name'   => 'Pagador 1',
            'payer2_name'   => 'Pagador 2',
            'payer1_salary' => 0,
            'payer2_salary' => 0,
        ]);
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
