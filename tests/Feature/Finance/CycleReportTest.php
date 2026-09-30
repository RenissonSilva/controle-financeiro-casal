<?php

namespace Tests\Feature\Finance;

use App\Models\Category;
use App\Models\Expense;
use App\Models\FixedExpense;
use App\Models\Setting;
use App\Services\Finance\CycleReport;
use App\Services\Finance\FixedExpenseMatcher;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class CycleReportTest extends TestCase
{
    use RefreshDatabase;

    private Category $food;
    private Category $home;

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow('2026-09-20 10:00:00');

        Setting::current()->update([
            'payer1_name' => 'Reni', 'payer2_name' => 'Lua',
            'payer1_salary' => 6000, 'payer2_salary' => 4000, 'card_closing_day' => 5,
        ]);

        $this->food = Category::create(['name' => 'Alimentação', 'color' => '#f59e0b', 'default_ownership' => 'both']);
        $this->home = Category::create(['name' => 'Moradia', 'color' => '#10b981', 'default_ownership' => 'both']);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    private function row(array $attributes): Expense
    {
        return Expense::create($attributes + [
            'description' => 'x', 'date' => '2026-09-10', 'direction' => 'out', 'kind' => 'expense',
            'ownership' => 'both', 'source' => 'payer1', 'status' => 'categorized',
        ]);
    }

    public function test_totals_split_and_refunds(): void
    {
        $this->row(['amount' => 1000, 'category_id' => $this->home->id]);            // compartilhado
        $this->row(['amount' => 200, 'category_id' => $this->food->id]);             // compartilhado
        $this->row(['amount' => 50, 'direction' => 'in', 'category_id' => $this->food->id]); // estorno
        $this->row(['amount' => 80, 'ownership' => 'payer1', 'category_id' => $this->food->id]);
        $this->row(['amount' => 30, 'ownership' => 'payer2', 'category_id' => $this->food->id]);
        // Nada disso é despesa:
        $this->row(['amount' => 3000, 'kind' => 'ignored', 'kind_reason' => 'bill_payment']);
        $this->row(['amount' => 5000, 'kind' => 'income', 'direction' => 'in']);
        $this->row(['amount' => 700, 'kind' => 'settlement', 'direction' => 'in']);
        // Outro ciclo:
        $this->row(['amount' => 999, 'date' => '2026-09-04']);

        $split = CycleReport::for('2026-09')->split();

        $this->assertSame(1260.0, $split['total']);          // 1000 + 200 − 50 + 80 + 30
        $this->assertSame(1150.0, $split['shared_total']);
        $this->assertSame(690.0, $split['payer1_shared']);    // 60%
        $this->assertSame(460.0, $split['payer2_shared']);
        $this->assertSame(770.0, $split['payer1_total']);
        $this->assertSame(490.0, $split['payer2_total']);
        $this->assertSame($split['total'], round($split['payer1_total'] + $split['payer2_total'], 2));
    }

    public function test_category_breakdown_sums_to_the_person_total(): void
    {
        $this->row(['amount' => 333.33, 'category_id' => $this->home->id]);
        $this->row(['amount' => 100.01, 'category_id' => $this->food->id]);
        $this->row(['amount' => 45.55, 'ownership' => 'payer1', 'category_id' => $this->food->id]);

        $report = CycleReport::for('2026-09');

        foreach (['couple' => 'total', 'payer1' => 'payer1_total', 'payer2' => 'payer2_total'] as $perspective => $key) {
            $sum = round(array_sum(array_column($report->byCategory($perspective), 'value')), 2);
            $this->assertSame($report->split()[$key], $sum, "Perspectiva {$perspective}");
        }
    }

    public function test_cash_flow_uses_only_payer1_income_and_share(): void
    {
        $this->row(['amount' => 1000]); // compartilhado → Reni 600
        $this->row(['amount' => 5000, 'kind' => 'income', 'direction' => 'in']);
        $this->row(['amount' => 700, 'kind' => 'settlement', 'direction' => 'in']); // Pix da Lua não é receita

        $flow = CycleReport::for('2026-09')->cashFlow();

        $this->assertSame([5000.0, 600.0, 4400.0], [$flow['income'], $flow['expenses'], $flow['balance']]);
    }

    public function test_settlement_due_comes_only_from_expenses(): void
    {
        // Reni paga 500 compartilhado (Lua: 200) + 50 só da Lua; Lua pagou 100 de mercado por
        // conta própria (lançado à mão, Reni: 60). O Pix de 400 da Lua não abate nada.
        $this->row(['amount' => 500, 'date' => '2026-09-10']);
        $this->row(['amount' => 50, 'ownership' => 'payer2', 'date' => '2026-09-11']);
        $this->row(['amount' => 100, 'source' => 'payer2', 'date' => '2026-09-12']);
        $this->row(['amount' => 400, 'kind' => 'settlement', 'direction' => 'in', 'date' => '2026-09-08']);
        // Agosto não entra na conta de setembro.
        $this->row(['amount' => 1000, 'date' => '2026-08-10']);

        // 200 + 50 − 60
        $this->assertSame(190.0, CycleReport::for('2026-09')->settlementDue());
    }

    public function test_settlement_lines_add_up_to_settlement_due(): void
    {
        $this->row(['amount' => 33.33]);                                    // Lua: 13,33
        $this->row(['amount' => 33.33]);                                    // juntos: Lua 26,66 (Reni fica com 40,00)
        $this->row(['amount' => 50, 'ownership' => 'payer2']);             // Lua: 50
        $this->row(['amount' => 100, 'source' => 'payer2']);               // Reni: 60 → abate
        $this->row(['amount' => 20, 'ownership' => 'payer1', 'source' => 'payer2']); // abate 20
        $this->row(['amount' => 80, 'ownership' => 'payer1']);             // só do Reni: fora

        $report = CycleReport::for('2026-09');
        $lines = $report->settlementLines();

        $this->assertCount(5, $lines);
        $this->assertSame($report->settlementDue(), round($lines->sum('impact'), 2));
        $this->assertSame(26.66, round($lines->where('expense.amount', 33.33)->sum('payer2_share'), 2));
        $this->assertSame(-20.0, $lines->firstWhere('expense.amount', 20.0)['impact']);
    }

    public function test_settlement_covers_next_cycle_fixed_expenses(): void
    {
        FixedExpense::create([
            'description' => 'Aluguel', 'amount' => 1260, 'due_day' => 1, 'ownership' => 'both', 'active' => true,
            'category_id' => $this->home->id, 'match_document' => '999.888.777-66',
        ]);
        FixedExpense::create([
            'description' => 'Internet', 'amount' => 79.90, 'due_day' => 10, 'ownership' => 'both', 'active' => true,
        ]);
        FixedExpense::create([
            'description' => 'Academia do Reni', 'amount' => 100, 'due_day' => 10, 'ownership' => 'payer1', 'active' => true,
        ]);

        // Aluguel de setembro (vence 01/10) pago no começo do ciclo: já coberto pelo acerto de agosto.
        $this->row(['amount' => 1260, 'date' => '2026-09-10', 'counterparty_document' => '99988877766', 'description' => 'Transferência enviada|Locadora']);
        FixedExpenseMatcher::make()->matchCycle('2026-09');
        $this->row(['amount' => 100]); // compartilhado → Lua 40

        $report = CycleReport::for('2026-09');
        $fixed = $report->settlementFixed()->keyBy('description');

        // As fixas de outubro (10/10 e 01/11) entram pela estimativa; a só do Reni fica de fora.
        $this->assertSame(['Internet', 'Aluguel'], $report->settlementFixed()->pluck('description')->all());
        $this->assertSame('2026-11-01', $fixed['Aluguel']['due_date']);
        $this->assertSame(504.0, $fixed['Aluguel']['payer2_share']);
        $this->assertSame(31.96, $fixed['Internet']['payer2_share']);

        $this->assertCount(1, $report->settlementLines());
        $this->assertSame(575.96, $report->settlementDue()); // 40 + 504 + 31,96
        $this->assertSame($report->settlementDue(), round($report->settlementLines()->sum('impact') + $fixed->sum('payer2_share'), 2));
    }

    public function test_fixed_expense_is_linked_to_its_pix_and_counted_once(): void
    {
        $rent = FixedExpense::create([
            'description' => 'Aluguel', 'amount' => 1260, 'due_day' => 1, 'ownership' => 'both', 'active' => true,
            'category_id' => $this->home->id, 'match_document' => '999.888.777-66',
        ]);
        FixedExpense::create([
            'description' => 'Internet', 'amount' => 79.90, 'due_day' => 30, 'ownership' => 'both', 'active' => true,
            'match_pattern' => 'NEW LINK',
        ]);

        $pix = $this->row(['amount' => 1260, 'date' => '2026-09-10', 'counterparty_document' => '99988877766', 'description' => 'Transferência enviada|Locadora']);

        $linked = FixedExpenseMatcher::make()->matchCycle('2026-09');

        $this->assertSame(1, $linked);
        $this->assertSame($this->home->id, $pix->fresh()->category_id);

        $report = CycleReport::for('2026-09');
        $fixed = $report->fixedExpenses()->keyBy('description');

        $this->assertSame('paid', $fixed['Aluguel']['status']);
        $this->assertSame($pix->id, $fixed['Aluguel']['payment']['id']);
        $this->assertSame('upcoming', $fixed['Internet']['status']);
        // Só a internet (não paga) entra como "ainda vai sair"; o aluguel já está nas despesas.
        $this->assertSame(79.90, $report->pendingFixed());
        $this->assertSame(1260.0, $report->split()['total']);
        $this->assertSame($rent->id, $pix->fresh()->fixedOccurrence->fixed_expense_id);
    }
}
