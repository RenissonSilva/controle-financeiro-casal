<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CategorizationRule extends Model
{
    protected $fillable = ['pattern', 'amount', 'category_id', 'ownership'];

    protected $casts = [
        'amount' => 'float',
    ];

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    /**
     * Retorna a primeira regra cujo padrão bate com a descrição (contém, case-insensitive)
     * e, se a regra tiver valor definido, cujo valor bate exatamente com o informado.
     */
    public static function matchFor(string $description, float $amount): ?self
    {
        $description = mb_strtolower($description);

        return static::all()->first(function (self $rule) use ($description, $amount) {
            if ($rule->amount !== null && abs($rule->amount - $amount) > 0.001) {
                return false;
            }

            return str_contains($description, mb_strtolower($rule->pattern));
        });
    }
}
