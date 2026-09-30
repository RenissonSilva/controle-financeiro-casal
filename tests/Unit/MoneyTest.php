<?php

namespace Tests\Unit;

use App\Services\Finance\Money;
use PHPUnit\Framework\TestCase;

class MoneyTest extends TestCase
{
    public function test_distribute_keeps_the_exact_total(): void
    {
        // 100 / 3 = 33,333... — arredondar cada parte daria 99,99.
        $parts = Money::distribute([100 / 3, 100 / 3, 100 / 3], 100.00);

        $this->assertSame(100.0, round(array_sum($parts), 2));
        $this->assertEqualsCanonicalizing([33.34, 33.33, 33.33], array_values($parts));
    }

    public function test_distribute_handles_negative_values(): void
    {
        // Categoria só com estorno fica negativa; o total ainda precisa bater.
        $parts = Money::distribute(['a' => 150.555, 'b' => -20.004, 'c' => 9.449], 140.00);

        $this->assertSame(140.0, round(array_sum($parts), 2));
        $this->assertSame(['a', 'b', 'c'], array_keys($parts));
    }

    public function test_distribute_of_empty_list(): void
    {
        $this->assertSame([], Money::distribute([], 0));
    }
}
