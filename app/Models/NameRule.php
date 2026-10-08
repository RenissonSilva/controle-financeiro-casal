<?php

namespace App\Models;

use App\Models\Concerns\RecordsActivity;
use App\Support\ExpensePresenter;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Collection;

/**
 * Nome personalizado para lançamentos cuja descrição do banco bate com um filtro no estilo
 * LIKE do MySQL: "%" = qualquer texto, "_" = um caractere, "\%" = o próprio "%". Sem
 * diferenciar maiúsculas nem acentos. Ex: "Amazon %" → "Amazon III", "Amazon IV".
 */
class NameRule extends Model
{
    use RecordsActivity;

    protected $fillable = ['pattern', 'name'];

    public function expenses(): HasMany
    {
        return $this->hasMany(Expense::class);
    }

    // Filtro que pega só esta descrição (sem curinga).
    public static function exactPattern(string $description): string
    {
        return addcslashes($description, '%_\\');
    }

    public function regex(): string
    {
        $regex = '';
        $pattern = CategorizationRule::normalize($this->pattern);

        for ($i = 0, $length = strlen($pattern); $i < $length; $i++) {
            $char = $pattern[$i];

            if ($char === '\\' && $i + 1 < $length) {
                $regex .= preg_quote($pattern[++$i], '/');
            } else {
                $regex .= match ($char) {
                    '%' => '.*',
                    '_' => '.',
                    default => preg_quote($char, '/'),
                };
            }
        }

        return '/^'.$regex.'$/s';
    }

    /**
     * Bate com a descrição inteira ("Transferência enviada|Fulano") ou só com o nome que
     * aparece na tela ("Fulano").
     */
    public function matches(string $description): bool
    {
        $regex = $this->regex();
        $candidates = array_unique([$description, ExpensePresenter::splitDescription($description)[1]]);

        foreach ($candidates as $candidate) {
            if (preg_match($regex, CategorizationRule::normalize($candidate))) {
                return true;
            }
        }

        return false;
    }

    // Quanto do filtro é texto fixo: com duas regras batendo, vence a mais específica.
    public function specificity(): int
    {
        return strlen(preg_replace('/(?<!\\\\)[%_]/', '', $this->pattern));
    }

    /**
     * Regra que vale para a descrição: a mais específica; no empate, a mais nova.
     *
     * @param  Collection<int, self>|null  $rules
     */
    public static function bestFor(string $description, ?Collection $rules = null): ?self
    {
        return ($rules ?? static::all())
            ->filter(fn (self $rule) => $rule->matches($description))
            ->sortBy([fn (self $a, self $b) => $b->specificity() <=> $a->specificity(), fn (self $a, self $b) => $b->id <=> $a->id])
            ->first();
    }

    /**
     * Recalcula o nome personalizado dos lançamentos (todos, ou só os ids informados).
     * Devolve quantos mudaram.
     *
     * @param  iterable<int>|null  $ids
     */
    public static function apply(?iterable $ids = null): int
    {
        $rules = static::all();
        $changed = 0;
        $query = Expense::query()->select(['id', 'description', 'custom_name', 'name_rule_id']);

        if ($ids !== null) {
            $query->whereIn('id', collect($ids)->all());
        }

        $query->chunkById(500, function ($expenses) use ($rules, &$changed) {
            foreach ($expenses as $expense) {
                $rule = static::bestFor($expense->description, $rules);

                if ($expense->name_rule_id !== $rule?->id || $expense->custom_name !== $rule?->name) {
                    Expense::whereKey($expense->id)->update(['name_rule_id' => $rule?->id, 'custom_name' => $rule?->name]);
                    $changed++;
                }
            }
        });

        return $changed;
    }

    // ---- Histórico de mudanças ----

    public function activityArea(): string
    {
        return 'expenses';
    }

    public function activityNoun(): string
    {
        return 'o nome personalizado';
    }

    public function activityLabel(): string
    {
        return $this->name;
    }

    public function activityFields(): array
    {
        return [
            'name' => 'Nome',
            'pattern' => 'Vale para',
        ];
    }
}
