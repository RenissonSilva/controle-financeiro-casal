<?php

namespace App\Models;

use App\Models\Concerns\RecordsActivity;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Category extends Model
{
    use RecordsActivity;

    protected $fillable = ['name', 'color', 'default_ownership'];

    public function expenses(): HasMany
    {
        return $this->hasMany(Expense::class);
    }

    // ---- Histórico de mudanças ----

    public function activityArea(): string
    {
        return 'settings';
    }

    public function activityNoun(): string
    {
        return 'a categoria';
    }

    public function activityLabel(): string
    {
        return $this->name;
    }

    public function activityFields(): array
    {
        return [
            'name' => 'Nome',
            'color' => 'Cor',
            'default_ownership' => ['De quem é (padrão)', 'payer'],
        ];
    }
}
