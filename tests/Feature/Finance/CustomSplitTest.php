<?php

namespace Tests\Feature\Finance;

use App\Models\Expense;
use App\Models\Setting;
use App\Models\User;
use App\Services\Finance\CycleReport;
use App\Services\Finance\InstallmentPurchase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

// Divisão definida à mão num gasto "Nós" (ex: R$ 400 = Reni 120 + Lua 280), inclusive em compra parcelada.
class CustomSplitTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow('2026-09-20 10:00:00');
        $this->user = User::factory()->create();
        Setting::current()->update([
            'payer1_name' => 'Reni', 'payer2_name' => 'Lua',
            'payer1_salary' => 6000, 'payer2_salary' => 4000, 'card_closing_day' => 5,
        ]);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    private function row(array $attributes = []): Expense
    {
        return Expense::create($attributes + [
            'description' => 'Mercado', 'amount' => 100, 'date' => '2026-09-10', 'direction' => 'out', 'kind' => 'expense',
            'ownership' => 'both', 'source' => 'payer1', 'status' => 'categorized',
        ]);
    }

    // Parcela de compra no cartão, como o Pluggy manda (a 1ª leva o centavo que sobra).
    private function installment(int $number, float $amount, string $date, array $attributes = []): Expense
    {
        return $this->row($attributes + [
            'description' => "Loja Moveis {$number}/3", 'amount' => $amount, 'date' => $date,
            'origin' => 'open_finance', 'account_id' => 'card-1', 'account_type' => 'CREDIT',
            'installment_number' => $number, 'installment_total' => 3, 'external_id' => "tx-{$number}-".uniqid(),
        ]);
    }

    private function update(Expense $expense, array $data)
    {
        return $this->actingAs($this->user)->from('/expenses')->put("/expenses/{$expense->id}", $data + [
            'notes' => null, 'category_id' => null, 'kind' => 'expense', 'ownership' => 'both', 'fixed_expense_id' => null,
        ]);
    }

    public function test_report_uses_the_defined_shares(): void
    {
        $this->row(['amount' => 400, 'payer1_share' => 120]);          // Reni 120 · Lua 280
        $this->row(['amount' => 100]);                                  // pela renda: 60 · 40
        $this->row(['amount' => 50, 'ownership' => 'payer2', 'source' => 'payer2']);

        $report = CycleReport::for('2026-09');
        $split = $report->split();

        $this->assertSame(500.0, $split['shared_total']);
        $this->assertSame(180.0, $split['payer1_shared']);
        $this->assertSame(320.0, $split['payer2_shared']);
        $this->assertSame(370.0, $split['payer2_total']);
        $this->assertSame(1, $split['custom_shared']);

        $byCategory = collect($report->byCategory('payer2'))->sum('value');
        $this->assertEqualsWithDelta($split['payer2_total'], $byCategory, 0.001);

        // Reni pagou os compartilhados; Lua pagou um gasto só dela (fora do acerto).
        $this->assertSame(320.0, $report->settlementDue());
        $this->assertEqualsWithDelta($report->settlementDue(), $report->settlementLines()->sum('impact'), 0.001);
    }

    public function test_refund_and_partner_paid_expense_with_defined_shares(): void
    {
        $this->row(['amount' => 200, 'source' => 'payer2', 'payer1_share' => 150]); // Lua pagou; Reni deve 150
        $this->row(['amount' => 40, 'direction' => 'in', 'payer1_share' => 10]);    // estorno: abate 10 · 30

        $report = CycleReport::for('2026-09');

        $this->assertSame(140.0, $report->split()['payer1_shared']);
        $this->assertSame(20.0, $report->split()['payer2_shared']);
        $this->assertSame(-180.0, $report->settlementDue()); // −150 (Reni deve) − 30 (estorno abate a parte da Lua)
        $this->assertEqualsWithDelta($report->settlementDue(), $report->settlementLines()->sum('impact'), 0.001);
    }

    public function test_editing_a_single_expense_sets_and_validates_the_shares(): void
    {
        $expense = $this->row(['amount' => 400, 'origin' => 'open_finance']);

        $this->update($expense, ['split' => 'custom', 'payer1_share' => 401])->assertSessionHasErrors('payer1_share');
        $this->assertNull($expense->fresh()->payer1_share);

        $this->update($expense, ['split' => 'custom', 'payer1_share' => 120])->assertSessionHasNoErrors();
        $this->assertSame(120.0, $expense->fresh()->payer1_share);
        $this->assertSame('user', $expense->fresh()->category_source);

        // Sem mexer na divisão (split ausente), continua como estava.
        $this->update($expense, ['notes' => 'feira'])->assertSessionHasNoErrors();
        $this->assertSame(120.0, $expense->fresh()->payer1_share);

        $this->update($expense, ['split' => 'income'])->assertSessionHasNoErrors();
        $this->assertNull($expense->fresh()->payer1_share);
    }

    public function test_new_manual_expense_can_have_defined_shares(): void
    {
        $this->actingAs($this->user)->from('/expenses')->post('/expenses', [
            'description' => 'Presente', 'amount' => 300, 'date' => '2026-09-12', 'kind' => 'expense',
            'ownership' => 'both', 'source' => 'payer1', 'split' => 'custom', 'payer1_share' => 100,
        ])->assertSessionHasNoErrors();

        $this->assertSame(100.0, Expense::where('description', 'Presente')->first()->payer1_share);
    }

    public function test_changing_the_owner_drops_the_defined_shares(): void
    {
        $expense = $this->row(['amount' => 400, 'payer1_share' => 120]);

        $expense->update(['ownership' => 'payer1']);
        $this->assertNull($expense->fresh()->payer1_share);

        // De volta a "Nós" pelo atalho da lista: pela renda, não a divisão antiga.
        $this->actingAs($this->user)->from('/expenses')->post('/expenses/batch', [
            'expenses' => [['id' => $expense->id, 'category_id' => null, 'ownership' => 'both']],
        ])->assertSessionHasNoErrors();
        $this->assertNull($expense->fresh()->payer1_share);
    }

    public function test_installment_purchase_splits_every_installment(): void
    {
        // R$ 400,00 em 3×: 133,34 + 133,33 + 133,33.
        $first = $this->installment(1, 133.34, '2026-08-20');
        $second = $this->installment(2, 133.33, '2026-09-05');
        $third = $this->installment(3, 133.33, '2026-10-05', ['ownership' => 'payer1']);
        $other = $this->row(['description' => 'Loja Moveis 1/3', 'amount' => 50, 'date' => '2026-07-10', 'account_id' => 'card-1', 'installment_number' => 1, 'installment_total' => 3]);

        $this->assertSame([$first->id, $second->id, $third->id], InstallmentPurchase::of($second)->pluck('id')->all());

        // Reni paga R$ 120 da compra toda, Lua R$ 280.
        $this->update($second, ['split' => 'custom', 'payer1_share' => 120])->assertSessionHasNoErrors();

        $shares = Expense::whereIn('id', [$first->id, $second->id, $third->id])->orderBy('installment_number')->get();
        $this->assertSame(['both', 'both', 'both'], $shares->pluck('ownership')->all());
        $this->assertEqualsWithDelta(120, $shares->sum('payer1_share'), 0.001);
        $this->assertEqualsWithDelta(280, $shares->sum(fn (Expense $e) => $e->amount - $e->payer1_share), 0.001);
        $this->assertSame([40.0, 40.0, 40.0], $shares->pluck('payer1_share')->all());
        $this->assertNull($other->fresh()->payer1_share);

        // Mais do que a compra toda não passa.
        $this->update($second, ['split' => 'custom', 'payer1_share' => 400.01])->assertSessionHasErrors('payer1_share');

        // A tela de lançamentos manda as parcelas para o formulário.
        $this->actingAs($this->user)->get('/expenses?month=2026-09')->assertInertia(fn (Assert $page) => $page
            ->where('rows.0.purchase.count', 3)
            ->has('rows.0.purchase.items', 3)
            ->where('rows.0.custom_payer1_share', 40));

        // Voltar para a renda desfaz em todas as parcelas.
        $this->update($first, ['split' => 'income'])->assertSessionHasNoErrors();
        $this->assertSame(0, Expense::whereNotNull('payer1_share')->count());
    }

    public function test_uneven_installments_still_add_up_exactly(): void
    {
        $installments = collect([[1, 33.34, '2026-08-20'], [2, 33.33, '2026-09-05'], [3, 33.33, '2026-10-05']])
            ->map(fn ($i) => $this->installment($i[0], $i[1], $i[2]));

        $this->update($installments[1], ['split' => 'custom', 'payer1_share' => 50])->assertSessionHasNoErrors();

        $shares = Expense::whereIn('id', $installments->pluck('id'))->orderBy('installment_number')->pluck('payer1_share');
        $this->assertEqualsWithDelta(50, $shares->sum(), 0.001);
        $this->assertTrue($shares->every(fn ($share) => $share >= 16.66 && $share <= 16.68));
    }

    public function test_settlement_page_and_pdf_show_the_defined_shares(): void
    {
        $custom = $this->row(['amount' => 400, 'payer1_share' => 120, 'date' => '2026-09-11']);
        $this->row(['amount' => 100, 'date' => '2026-09-10']);

        $this->actingAs($this->user)->get('/settlement?month=2026-09')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('summary.due', 320)
            ->where('lines.0.id', $custom->id)
            ->where('lines.0.custom_payer1_share', 120)
            ->where('lines.0.payer2_share', 280)
            ->where('lines.1.custom_payer1_share', null)
            ->where('lines.1.payer2_share', 40));

        $this->actingAs($this->user)->post('/expenses/export-pdf', ['months' => ['2026-09'], 'ownerships' => ['payer1', 'payer2', 'both']])
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf');
    }

    public function test_installment_that_arrives_later_follows_the_purchase_split(): void
    {
        $first = $this->installment(1, 133.34, '2026-08-20');
        $this->update($first, ['split' => 'custom', 'payer1_share' => 120])->assertSessionHasNoErrors();
        $this->assertEqualsWithDelta(40, $first->fresh()->payer1_share, 0.001);

        // Parcelas 2 e 3 não tinham chegado (estimadas); a 2 chega agora pela sincronização.
        $second = $this->installment(2, 133.33, '2026-09-05', ['status' => 'pending']);
        $this->assertSame(1, InstallmentPurchase::inheritSplits(collect([$second])));

        $second->refresh();
        $this->assertSame('both', $second->ownership);
        $this->assertEqualsWithDelta(40, $second->payer1_share, 0.01);
        $this->assertSame('categorized', $second->status);
    }
}
