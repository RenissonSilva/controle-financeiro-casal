<?php

namespace App\Models\Concerns;

use App\Support\Activity;

/**
 * Registra no histórico de mudanças a criação, edição e exclusão do modelo (ver Activity).
 * Só os campos de activityFields() contam — campos internos (status, competência...) não.
 */
trait RecordsActivity
{
    public static function bootRecordsActivity(): void
    {
        static::created(fn (self $model) => Activity::modelCreated($model));
        static::updated(fn (self $model) => Activity::modelUpdated($model));
        static::deleted(fn (self $model) => Activity::modelDeleted($model));
    }

    // Área do sistema (filtro do histórico): expenses, fixed, goals ou settings.
    abstract public function activityArea(): string;

    // Como o registro é chamado no histórico, com artigo: "o lançamento", "a meta".
    abstract public function activityNoun(): string;

    // Nome que identifica o registro: "iFood · R$ 45,90 · 03/10/2026", "Aluguel".
    abstract public function activityLabel(): string;

    /**
     * Campos que entram no histórico: campo => rótulo, ou campo => [rótulo, tipo] (ver Activity::format).
     *
     * @return array<string, string|array{0: string, 1: string}>
     */
    abstract public function activityFields(): array;

    public function activityEvents(): array
    {
        return ['created', 'updated', 'deleted'];
    }

    // "criou o lançamento", "editou a meta", "excluiu a categoria".
    public function activityDescription(string $action): string
    {
        $verb = ['created' => 'criou', 'updated' => 'editou', 'deleted' => 'excluiu'][$action] ?? $action;

        return "{$verb} {$this->activityNoun()}";
    }
}
