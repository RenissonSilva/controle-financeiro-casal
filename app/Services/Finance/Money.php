<?php

namespace App\Services\Finance;

final class Money
{
    /**
     * Arredonda uma lista de valores para centavos garantindo que a soma bata exatamente
     * com `$target` (método do maior resto). Evita o "R$ 0,01 sumido" quando uma soma é
     * quebrada em partes (ex: sua parte por categoria vs. sua parte total).
     *
     * @param  array<array-key, float>  $values
     * @return array<array-key, float>
     */
    public static function distribute(array $values, float $target): array
    {
        if ($values === []) {
            return [];
        }

        $targetCents = (int) round($target * 100);
        $floors = [];
        $remainders = [];

        foreach ($values as $key => $value) {
            $cents = $value * 100;
            $floors[$key] = (int) floor($cents);
            $remainders[$key] = $cents - floor($cents);
        }

        $missing = $targetCents - array_sum($floors);
        $step = $missing >= 0 ? 1 : -1;
        $missing >= 0 ? arsort($remainders) : asort($remainders);
        $keys = array_keys($remainders);

        for ($i = 0; $missing !== 0; $i++) {
            $floors[$keys[$i % count($keys)]] += $step;
            $missing -= $step;
        }

        return array_map(fn (int $cents) => $cents / 100, $floors);
    }
}
