<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// Uma linha do histórico de mudanças (ver App\Support\Activity).
class ActivityLog extends Model
{
    public const UPDATED_AT = null;

    public const AREAS = [
        'expenses' => 'Lançamentos',
        'fixed' => 'Contas fixas',
        'goals' => 'Metas',
        'settings' => 'Configurações',
        'access' => 'Acesso',
    ];

    protected $fillable = [
        'user_id', 'user_name', 'batch', 'area', 'action', 'subject_type', 'subject_id',
        'description', 'subject_label', 'changes', 'created_at',
    ];

    protected $casts = [
        'changes' => 'array',
        'created_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
