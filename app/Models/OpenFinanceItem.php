<?php

namespace App\Models;

use App\Models\Concerns\RecordsActivity;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class OpenFinanceItem extends Model
{
    use RecordsActivity;

    protected $fillable = ['item_id', 'connector_name', 'owner', 'owner_document', 'status', 'last_synced_at', 'last_sync_error'];

    protected $casts = [
        'last_synced_at' => 'datetime',
    ];

    public function accounts(): HasMany
    {
        return $this->hasMany(OpenFinanceAccount::class);
    }

    public function investments(): HasMany
    {
        return $this->hasMany(OpenFinanceInvestment::class);
    }

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
        return 'a conexão com o banco';
    }

    public function activityLabel(): string
    {
        return $this->connector_name ?? 'Banco';
    }

    public function activityFields(): array
    {
        return [
            'connector_name' => 'Banco',
            'owner' => ['Conta de', 'payer'],
        ];
    }
}
