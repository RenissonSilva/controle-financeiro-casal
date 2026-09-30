<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

class CategorizationRule extends Model
{
    public const ACTION_CATEGORIZE = 'categorize';
    public const ACTION_IGNORE = 'ignore';

    protected $fillable = ['pattern', 'action', 'amount', 'category_id', 'ownership'];

    protected $casts = [
        'amount' => 'float',
    ];

    protected $attributes = [
        'action' => self::ACTION_CATEGORIZE,
    ];

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    // Minúsculas, sem acento e com espaços normalizados — "Transferência" bate com "transferencia".
    public static function normalize(?string $text): string
    {
        return trim(preg_replace('/\s+/', ' ', Str::lower(Str::ascii((string) $text))));
    }

    /**
     * Retorna a primeira regra cujo padrão aparece na descrição, no nome de quem
     * recebeu/pagou ou no nome personalizado (contém, sem diferenciar maiúsculas/acentos) e, se a regra tiver
     * valor definido, cujo valor bate exatamente.
     *
     * @param  Collection<int, self>|null  $rules  regras já carregadas (evita uma query por lançamento)
     */
    public static function matchFor(string $description, float $amount, ?string $counterparty = null, ?Collection $rules = null, ?string $customName = null): ?self
    {
        $haystacks = array_filter([self::normalize($description), self::normalize($counterparty), self::normalize($customName)]);

        return ($rules ?? static::all())->first(function (self $rule) use ($haystacks, $amount) {
            if ($rule->amount !== null && abs($rule->amount - $amount) > 0.001) {
                return false;
            }

            $needle = self::normalize($rule->pattern);

            if ($needle === '') {
                return false;
            }

            foreach ($haystacks as $haystack) {
                if (str_contains($haystack, $needle)) {
                    return true;
                }
            }

            return false;
        });
    }

    public static function matchForExpense(Expense $expense, ?Collection $rules = null): ?self
    {
        return self::matchFor($expense->description, $expense->amount, $expense->counterparty_name, $rules, $expense->custom_name);
    }
}
