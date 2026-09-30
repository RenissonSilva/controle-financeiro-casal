<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Expense;
use App\Models\FixedExpense;
use App\Models\Goal;
use App\Models\OpenFinanceItem;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PagesTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow('2026-09-20 10:00:00');
        $this->user = User::factory()->create();
        Setting::current()->update(['payer1_name' => 'Reni', 'payer2_name' => 'Lua', 'payer1_salary' => 6000, 'payer2_salary' => 4000]);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    public function test_every_page_renders(): void
    {
        $item = OpenFinanceItem::create(['item_id' => 'i', 'owner' => 'payer1', 'status' => 'UPDATED']);
        Expense::create(['description' => 'Mercado', 'amount' => 10, 'date' => '2026-09-10', 'ownership' => 'both']);

        $this->actingAs($this->user)->get('/dashboard')->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('Dashboard')->where('greetingName', 'Reni')->where('cycle.month', '2026-09'));
        $this->actingAs($this->user)->get('/expenses')->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('Expenses')->has('rows', 1));
        $this->actingAs($this->user)->get('/settlement?month=2026-09')->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('Settlement')->has('lines', 1)->where('lines.0.payer2_share', 4));
        $this->actingAs($this->user)->get('/fixed-expenses')->assertOk()->assertInertia(fn (Assert $page) => $page->component('FixedExpenses'));
        $this->actingAs($this->user)->get('/goals')->assertOk()->assertInertia(fn (Assert $page) => $page->component('Goals'));
        $this->actingAs($this->user)->get('/settings')->assertOk()->assertInertia(fn (Assert $page) => $page->component('Settings')->has('connections', 1));
        $this->actingAs($this->user)->get("/open-finance/items/{$item->id}")->assertOk()->assertInertia(fn (Assert $page) => $page->component('OpenFinanceDetails'));
        $this->actingAs($this->user)->get('/open-finance')->assertRedirect(route('settings.show').'#contas');
    }

    public function test_manual_entries_edit_ignore_and_batch(): void
    {
        $category = Category::create(['name' => 'Casa', 'color' => '#123456', 'default_ownership' => 'both']);

        $this->actingAs($this->user)->post('/expenses', [
            'description' => 'Feira', 'amount' => 50, 'date' => '2026-09-12', 'kind' => 'expense',
            'category_id' => $category->id, 'ownership' => 'both', 'source' => 'payer2',
        ])->assertSessionHas('success');

        $expense = Expense::firstWhere('description', 'Feira');
        $this->assertSame(['manual', 'payer2', 'out', '2026-09'], [$expense->origin, $expense->source, $expense->direction, $expense->competence]);

        // Pix da Lua lançado à mão (dinheiro vivo).
        $this->actingAs($this->user)->post('/expenses', [
            'description' => 'Lua pagou em dinheiro', 'amount' => 30, 'date' => '2026-09-13', 'kind' => 'settlement',
            'settlement_direction' => 'in', 'ownership' => 'both', 'source' => 'payer1',
        ]);
        $this->assertSame('in', Expense::firstWhere('kind', 'settlement')->direction);

        $this->actingAs($this->user)->put("/expenses/{$expense->id}", [
            'description' => 'Feira livre', 'amount' => 55, 'date' => '2026-09-12', 'source' => 'payer2',
            'notes' => 'orgânicos', 'category_id' => null, 'ownership' => 'payer2', 'kind' => 'expense',
        ])->assertSessionHas('success');
        $this->assertSame(['Feira livre', 55.0, 'payer2', 'orgânicos'], [$expense->fresh()->description, $expense->fresh()->amount, $expense->fresh()->ownership, $expense->fresh()->notes]);

        $this->actingAs($this->user)->post("/expenses/{$expense->id}/ignore");
        $this->assertSame('ignored', $expense->fresh()->kind);
        $this->actingAs($this->user)->post("/expenses/{$expense->id}/ignore");
        $this->assertSame('expense', $expense->fresh()->kind);

        $this->actingAs($this->user)->post('/expenses/batch', ['expenses' => [
            ['id' => $expense->id, 'category_id' => $category->id, 'ownership' => 'both'],
        ]])->assertSessionHas('success');
        $this->assertSame(['both', 'user'], [$expense->fresh()->ownership, $expense->fresh()->category_source]);

        $this->actingAs($this->user)->delete("/expenses/{$expense->id}");
        $this->assertNull($expense->fresh());
    }

    public function test_bank_entries_cannot_be_deleted_or_have_amount_changed(): void
    {
        $expense = Expense::create([
            'description' => 'Pix|Loja', 'amount' => 80, 'date' => '2026-09-10', 'origin' => 'open_finance',
            'external_id' => 'x1', 'account_type' => 'BANK', 'ownership' => 'both',
        ]);

        $this->actingAs($this->user)->put("/expenses/{$expense->id}", [
            'amount' => 1, 'notes' => 'ok', 'ownership' => 'payer1', 'kind' => 'expense',
        ]);
        $this->assertSame([80.0, 'payer1', 'ok'], [$expense->fresh()->amount, $expense->fresh()->ownership, $expense->fresh()->notes]);

        $this->actingAs($this->user)->delete("/expenses/{$expense->id}")->assertSessionHas('error');
        $this->assertNotNull($expense->fresh());
    }

    public function test_ownership_can_apply_to_this_expense_only_or_to_all_from_the_same_merchant(): void
    {
        $food = Category::create(['name' => 'Delivery', 'color' => '#fff', 'default_ownership' => 'both']);
        $make = fn (string $date, string $id) => Expense::create([
            'description' => 'Ifood 123', 'amount' => 40, 'date' => $date, 'origin' => 'open_finance',
            'external_id' => $id, 'ownership' => 'both', 'category_id' => $food->id, 'category_source' => 'ai',
        ]);
        $old = $make('2026-07-10', 'a');
        $current = $make('2026-09-10', 'b');
        $later = $make('2026-09-15', 'c');

        // Só este: os outros não mudam e a próxima cobrança não herda o dono.
        $this->actingAs($this->user)->put("/expenses/{$current->id}", [
            'ownership' => 'payer1', 'kind' => 'expense', 'category_id' => $food->id, 'ownership_scope' => 'one',
        ]);
        $this->assertSame('one', $current->fresh()->ownership_scope);
        $this->assertSame('both', $later->fresh()->ownership);

        $next = Expense::create(['description' => 'Ifood 456', 'amount' => 30, 'date' => '2026-09-18', 'ownership' => 'both', 'status' => 'pending', 'origin' => 'open_finance', 'external_id' => 'd']);
        app(\App\Services\Categorization\Categorizer::class)->applyLocal([$next->id]);
        $this->assertSame('both', $next->fresh()->ownership);

        // Todos: vale deste mês em diante e para as próximas; meses anteriores ficam.
        $this->actingAs($this->user)->put("/expenses/{$current->id}", [
            'ownership' => 'payer2', 'kind' => 'expense', 'category_id' => $food->id, 'ownership_scope' => 'all',
        ])->assertSessionHas('success', 'Lançamento atualizado — dono aplicado a mais 2 lançamentos.');
        $this->assertSame(['both', 'payer2', 'payer2', 'payer2'], [$old->fresh()->ownership, $current->fresh()->ownership, $later->fresh()->ownership, $next->fresh()->ownership]);

        // A escolha fica salva e volta marcada ao reabrir; salvar de novo sem mexer não repropaga.
        $this->assertSame('all', \App\Support\ExpensePresenter::row($current->fresh())['ownership_scope']);
        $this->actingAs($this->user)->put("/expenses/{$current->id}", [
            'ownership' => 'payer2', 'kind' => 'expense', 'category_id' => $food->id, 'ownership_scope' => 'all', 'notes' => 'x',
        ])->assertSessionHas('success', 'Lançamento atualizado.');

        $future = Expense::create(['description' => 'Ifood 789', 'amount' => 25, 'date' => '2026-09-19', 'ownership' => 'both', 'status' => 'pending', 'origin' => 'open_finance', 'external_id' => 'e']);
        app(\App\Services\Categorization\Categorizer::class)->applyLocal([$future->id]);
        $this->assertSame('payer2', $future->fresh()->ownership);
    }

    public function test_fixed_expense_manual_link_and_unlink(): void
    {
        $fixed = FixedExpense::create(['description' => 'Aluguel', 'amount' => 1260, 'due_day' => 10, 'ownership' => 'both', 'active' => true]);
        $pix = Expense::create(['description' => 'Pix|Locadora', 'amount' => 1260, 'date' => '2026-09-10', 'ownership' => 'both']);

        $this->actingAs($this->user)->getJson("/fixed-expenses/{$fixed->id}/candidates?month=2026-09")->assertOk()->assertJsonPath('rows.0.id', $pix->id);

        $this->actingAs($this->user)->post("/fixed-expenses/{$fixed->id}/link", ['month' => '2026-09', 'expense_id' => $pix->id]);
        $this->assertSame($fixed->id, $pix->fresh()->fixedOccurrence->fixed_expense_id);

        $this->actingAs($this->user)->post("/fixed-expenses/{$fixed->id}/unlink", ['month' => '2026-09']);
        $this->assertNull($pix->fresh()->fixedOccurrence);
        $this->assertTrue($fixed->occurrences()->first()->skip_auto_match);
    }

    public function test_new_fixed_expense_without_start_date_starts_this_cycle(): void
    {
        $this->actingAs($this->user)->post('/fixed-expenses', [
            'description' => 'Academia', 'amount' => 99, 'due_day' => 15, 'ownership' => 'payer1', 'active' => true, 'variable_amount' => false,
        ])->assertSessionHas('success');

        $this->assertSame('2026-09-05', FixedExpense::firstWhere('description', 'Academia')->start_date->toDateString());
    }

    public function test_goals_crud_and_primary(): void
    {
        $this->actingAs($this->user)->post('/goals', ['name' => 'Reserva', 'target_amount' => 30000, 'tracking' => 'investments']);
        $this->actingAs($this->user)->post('/goals', ['name' => 'Viagem', 'target_amount' => 8000, 'tracking' => 'manual', 'manual_amount' => 2000, 'deadline' => '2026-12-31']);

        $this->assertTrue(Goal::firstWhere('name', 'Reserva')->is_primary);
        $this->assertFalse(Goal::firstWhere('name', 'Viagem')->is_primary);

        $viagem = Goal::firstWhere('name', 'Viagem');
        $this->actingAs($this->user)->post("/goals/{$viagem->id}/primary");
        $this->assertSame(['Viagem'], Goal::where('is_primary', true)->pluck('name')->all());

        $this->actingAs($this->user)->get('/goals')->assertInertia(fn (Assert $page) => $page
            ->where('goals.0.name', 'Viagem')
            ->where('goals.0.percent', 25)
            ->where('goals.0.monthly_needed', 2000));
    }
}
