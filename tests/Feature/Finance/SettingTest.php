<?php

namespace Tests\Feature\Finance;

use App\Models\Setting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SettingTest extends TestCase
{
    use RefreshDatabase;

    private function settings(float $salary1, float $salary2, int $closingDay = 5): Setting
    {
        $settings = Setting::current();
        $settings->update(['payer1_salary' => $salary1, 'payer2_salary' => $salary2, 'card_closing_day' => $closingDay]);

        return Setting::current();
    }

    public function test_shared_split_always_sums_to_the_original_amount(): void
    {
        // Proporção "feia" (60,9254...%): arredondar a % antes (60,93) dava R$ 0,46 de erro em R$ 10 mil.
        $settings = $this->settings(4850.37, 3110.51);

        foreach ([0.01, 0.03, 10.00, 999.99, 10000.00, 1234.57] as $amount) {
            [$payer1, $payer2] = $settings->splitShared($amount);
            $this->assertSame(round($amount, 2), round($payer1 + $payer2, 2), "Divisão de {$amount}");
        }

        [$payer1] = $settings->splitShared(10000.00);
        $this->assertSame(round(10000 * 4850.37 / (4850.37 + 3110.51), 2), $payer1);
    }

    public function test_split_without_salaries_is_half_half(): void
    {
        $settings = $this->settings(0, 0);

        $this->assertSame([50.0, 50.0], $settings->splitShared(100));
        $this->assertSame(50.0, $settings->payer1_percent);
    }

    public function test_billing_cycle_is_named_by_its_starting_month(): void
    {
        $settings = $this->settings(1, 1, 5);

        $this->assertSame('2026-09', $settings->billingCycleForDate('2026-09-05'));
        $this->assertSame('2026-09', $settings->billingCycleForDate('2026-10-04'));
        $this->assertSame('2026-08', $settings->billingCycleForDate('2026-09-04'));

        [$start, $end] = $settings->billingCycleRange('2026-09');
        $this->assertSame('2026-09-05', $start->toDateString());
        $this->assertSame('2026-10-04', $end->toDateString());
    }

    public function test_income_received_a_few_days_early_counts_in_the_next_cycle(): void
    {
        $settings = $this->settings(1, 1, 5);
        $settings->update(['income_grace_days' => 5]);
        $settings = Setting::current();

        // Salário que caiu no dia 3 (ciclo começa dia 5) é receita de setembro...
        $this->assertSame('2026-09', $settings->competenceFor('2026-09-03', null, null, 'income'));
        // ...mas uma despesa no mesmo dia continua em agosto.
        $this->assertSame('2026-08', $settings->competenceFor('2026-09-03', null, null, 'expense'));
        // Receita no meio do ciclo não muda de mês.
        $this->assertSame('2026-08', $settings->competenceFor('2026-08-20', null, null, 'income'));
    }

    public function test_changing_the_closing_day_moves_entries_between_cycles(): void
    {
        $this->settings(1, 1, 5);
        $expense = \App\Models\Expense::create(['description' => 'x', 'amount' => 10, 'date' => '2026-09-06']);
        $this->assertSame('2026-09', $expense->competence);

        Setting::current()->update(['card_closing_day' => 10]);
        \App\Models\Expense::recalculateCompetence();

        $this->assertSame('2026-08', $expense->fresh()->competence);
    }

    public function test_card_purchase_follows_the_real_bill_even_when_the_bank_closes_later(): void
    {
        $settings = $this->settings(1, 1, 5);

        // Compra de 06/09 numa fatura que fechou em 07/09 (vence 14/09) é do ciclo de agosto,
        // embora pela data caísse em setembro.
        $this->assertSame('2026-09', $settings->competenceFor('2026-09-06'));
        $this->assertSame('2026-08', $settings->competenceFor('2026-09-06', '2026-09-07', '2026-09-14'));
        // Sem data de fechamento, estima pelo vencimento.
        $this->assertSame('2026-08', $settings->competenceFor('2026-09-06', null, '2026-09-14'));
        // Fechamento adiantado para o dia 3.
        $this->assertSame('2026-08', $settings->competenceFor('2026-09-02', '2026-09-03', '2026-09-10'));
    }
}
