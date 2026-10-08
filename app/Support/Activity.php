<?php

namespace App\Support;

use App\Models\ActivityLog;
use App\Models\Category;
use App\Models\Expense;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

/**
 * Histórico de mudanças: quem mudou o quê.
 *
 * Os modelos com RecordsActivity entram sozinhos quando uma pessoa logada altera dados (requisição
 * que não é GET). Sincronização pelo console não entra. Rotinas automáticas disparadas por uma
 * ação (sincronizar, IA, reaplicar regras, reconhecer pagamentos) rodam em withoutRecording() —
 * senão uma ação viraria centenas de linhas — e a ação registra um resumo com record().
 */
final class Activity
{
    private static int $muted = 0;

    public static function withoutRecording(callable $callback): mixed
    {
        self::$muted++;

        try {
            return $callback();
        } finally {
            self::$muted--;
        }
    }

    // Registra uma ação (resumo, acesso). Sem pessoa logada (console) não registra nada.
    public static function record(
        string $area,
        string $action,
        string $description,
        ?string $label = null,
        ?Model $subject = null,
        array $changes = [],
        ?User $user = null,
    ): void {
        $user ??= Auth::user();

        if (! $user || self::$muted > 0) {
            return;
        }

        ActivityLog::create([
            'user_id' => $user->id,
            'user_name' => $user->name,
            'batch' => self::batch(),
            'area' => $area,
            'action' => $action,
            'subject_type' => $subject ? class_basename($subject) : null,
            'subject_id' => $subject?->getKey(),
            'description' => $description,
            'subject_label' => $label !== null ? Str::limit($label, 250) : null,
            'changes' => $changes ?: null,
            'created_at' => now(),
        ]);
    }

    /**
     * Linha de mudança já formatada para leitura.
     *
     * @return array{field: string, label: string, old: ?string, new: ?string}
     */
    public static function change(string $field, string $label, ?string $old, ?string $new): array
    {
        return ['field' => $field, 'label' => $label, 'old' => $old, 'new' => $new];
    }

    // ---- Eventos dos modelos (RecordsActivity) ----

    /** @param  Model&\App\Models\Concerns\RecordsActivity  $model */
    public static function modelCreated(Model $model): void
    {
        if (! self::recordingModels() || ! in_array('created', $model->activityEvents(), true)) {
            return;
        }

        $changes = self::snapshot($model, fn (?string $value) => [null, $value]);

        if ($changes) {
            self::record($model->activityArea(), 'created', $model->activityDescription('created'), $model->activityLabel(), $model, $changes);
        }
    }

    /** @param  Model&\App\Models\Concerns\RecordsActivity  $model */
    public static function modelUpdated(Model $model): void
    {
        if (! self::recordingModels() || ! in_array('updated', $model->activityEvents(), true)) {
            return;
        }

        $previous = $model->getPrevious();
        $changes = [];

        foreach ($model->activityFields() as $field => $spec) {
            if (! $model->wasChanged($field)) {
                continue;
            }

            [$label, $type] = self::spec($spec);
            $old = self::format($type, $previous[$field] ?? null);
            $new = self::format($type, $model->getAttributes()[$field] ?? null);

            // "10.00" → 10.0, "2026-10-01" → "2026-10-01 00:00:00": mudou no banco, não para quem lê.
            if ($old !== $new) {
                $changes[] = self::change($field, $label, $old, $new);
            }
        }

        if ($changes) {
            self::record($model->activityArea(), 'updated', $model->activityDescription('updated'), $model->activityLabel(), $model, $changes);
        }
    }

    /** @param  Model&\App\Models\Concerns\RecordsActivity  $model */
    public static function modelDeleted(Model $model): void
    {
        if (! self::recordingModels() || ! in_array('deleted', $model->activityEvents(), true)) {
            return;
        }

        $changes = self::snapshot($model, fn (?string $value) => [$value, null]);
        self::record($model->activityArea(), 'deleted', $model->activityDescription('deleted'), $model->activityLabel(), $model, $changes);
    }

    // ---- Formatação ----

    /**
     * Valor como aparece para quem lê: "R$ 1.234,50", "05/10/2026", "Sim", nome da categoria...
     */
    public static function format(?string $type, mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        return match ($type) {
            'money' => 'R$ '.number_format((float) $value, 2, ',', '.'),
            'date' => Carbon::parse($value)->format('d/m/Y'),
            'bool' => filter_var($value, FILTER_VALIDATE_BOOLEAN) ? 'Sim' : 'Não',
            'payer' => match ($value) {
                'both' => 'Nós',
                'payer1', 'payer2' => Setting::current()->payerName($value),
                default => (string) $value,
            },
            'kind' => ['expense' => 'Despesa', 'income' => 'Receita', 'settlement' => 'Acerto', 'ignored' => 'Ignorado'][$value] ?? (string) $value,
            'category' => Category::find($value)?->name ?? "#{$value}",
            'expense' => ($expense = Expense::find($value)) ? self::expenseLabel($expense) : "#{$value}",
            'tracking' => ['investments' => 'Saldo investido', 'manual' => 'Valor informado'][$value] ?? (string) $value,
            'rule_action' => ['categorize' => 'Categorizar', 'ignore' => 'Ignorar nos cálculos'][$value] ?? (string) $value,
            default => Str::limit((string) $value, 250),
        };
    }

    // "iFood · R$ 45,90 · 03/10/2026" — o nome sozinho não diz qual dos iFoods.
    public static function expenseLabel(Expense $expense): string
    {
        $name = $expense->custom_name ?: ExpensePresenter::splitDescription($expense->description)[1];

        return implode(' · ', array_filter([$name, self::format('money', $expense->amount), self::format('date', $expense->date)]));
    }

    private static function recordingModels(): bool
    {
        return self::$muted === 0 && Auth::check() && ! request()->isMethodSafe();
    }

    // Uma ação = uma requisição: o que ela mudou aparece junto no histórico.
    private static function batch(): string
    {
        $attributes = request()->attributes;

        if (! $attributes->has('activity_batch')) {
            $attributes->set('activity_batch', (string) Str::uuid());
        }

        return $attributes->get('activity_batch');
    }

    /** @return array{0: string, 1: ?string} */
    private static function spec(string|array $spec): array
    {
        return is_array($spec) ? [$spec[0], $spec[1] ?? null] : [$spec, null];
    }

    // Campos preenchidos do registro (criação/exclusão), já formatados.
    private static function snapshot(Model $model, callable $pair): array
    {
        $changes = [];

        foreach ($model->activityFields() as $field => $spec) {
            [$label, $type] = self::spec($spec);
            $value = self::format($type, $model->getAttributes()[$field] ?? null);

            if ($value !== null) {
                [$old, $new] = $pair($value);
                $changes[] = self::change($field, $label, $old, $new);
            }
        }

        return $changes;
    }
}
