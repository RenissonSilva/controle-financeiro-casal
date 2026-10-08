<?php

namespace Tests\Feature;

use App\Models\ActivityLog;
use App\Models\Category;
use App\Models\Expense;
use App\Models\FixedExpense;
use App\Models\Setting;
use App\Models\User;
use App\Support\Activity;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ActivityLogTest extends TestCase
{
    use RefreshDatabase;

    private User $owner;

    private User $member;

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow('2026-09-20 10:00:00');
        $this->owner = User::factory()->create(['name' => 'Reni']);
        $this->member = User::factory()->member(['expenses.edit', 'expenses.delete', 'fixed.edit'])->create(['name' => 'Lua']);
        Setting::current()->update(['payer1_name' => 'Reni', 'payer2_name' => 'Lua']);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    // "Categoria: Mercado → Restaurante" (o JSON do MySQL não guarda a ordem das chaves).
    private function lines(ActivityLog $log): array
    {
        return array_map(fn (array $c) => "{$c['label']}: ".($c['old'] ?? '—').' → '.($c['new'] ?? '—'), $log->changes);
    }

    public function test_edit_records_who_changed_which_fields(): void
    {
        $mercado = Category::create(['name' => 'Mercado', 'color' => '#123456', 'default_ownership' => 'both']);
        $expense = Expense::create(['description' => 'Pão', 'amount' => 12.5, 'date' => '2026-09-10', 'ownership' => 'both', 'origin' => 'manual']);

        // Sem ninguém logado (sincronização pelo console, seed) nada entra.
        $this->assertSame(0, ActivityLog::count());

        $this->actingAs($this->member)->put("/expenses/{$expense->id}", [
            'description' => 'Pão', 'amount' => 12.5, 'date' => '2026-09-10', 'source' => 'payer1',
            'category_id' => $mercado->id, 'ownership' => 'payer2', 'kind' => 'expense', 'notes' => null,
        ])->assertSessionHas('success');

        $log = ActivityLog::sole();
        $this->assertSame([$this->member->id, 'Lua', 'expenses', 'updated', 'editou o lançamento', 'Pão · R$ 12,50 · 10/09/2026'], [
            $log->user_id, $log->user_name, $log->area, $log->action, $log->description, $log->subject_label,
        ]);
        $this->assertSame(['Categoria: — → Mercado', 'De quem é: Nós → Lua'], $this->lines($log));

        // Salvar de novo sem mudar nada não gera linha.
        $this->actingAs($this->member)->put("/expenses/{$expense->id}", [
            'description' => 'Pão', 'amount' => '12.50', 'date' => '2026-09-10', 'source' => 'payer1',
            'category_id' => $mercado->id, 'ownership' => 'payer2', 'kind' => 'expense', 'notes' => null,
        ]);
        $this->assertSame(1, ActivityLog::count());
    }

    public function test_create_delete_and_batch_are_recorded(): void
    {
        $this->actingAs($this->member)->post('/expenses', [
            'description' => 'Feira', 'amount' => 50, 'date' => '2026-09-12', 'kind' => 'expense', 'ownership' => 'both', 'source' => 'payer2',
        ]);
        $feira = Expense::firstWhere('description', 'Feira');

        $created = ActivityLog::latest('id')->first();
        $this->assertSame(['created', 'criou o lançamento'], [$created->action, $created->description]);
        $this->assertContains('Valor: — → R$ 50,00', $this->lines($created));

        $other = Expense::create(['description' => 'Uber', 'amount' => 20, 'date' => '2026-09-13', 'ownership' => 'both']);
        $this->actingAs($this->owner)->post('/expenses/batch', ['expenses' => [
            ['id' => $feira->id, 'category_id' => null, 'ownership' => 'payer1'],
            ['id' => $other->id, 'category_id' => null, 'ownership' => 'payer2'],
        ]]);
        $batch = ActivityLog::where('user_id', $this->owner->id)->get();
        $this->assertCount(2, $batch);
        $this->assertCount(1, $batch->pluck('batch')->unique(), 'uma ação = um grupo no histórico');

        $this->actingAs($this->member)->delete("/expenses/{$feira->id}");
        $deleted = ActivityLog::latest('id')->first();
        $this->assertSame(['deleted', 'excluiu o lançamento', 'Feira · R$ 50,00 · 12/09/2026'], [$deleted->action, $deleted->description, $deleted->subject_label]);
        $this->assertContains('De quem é: Reni → —', $this->lines($deleted));
    }

    public function test_automatic_routines_stay_out_and_settings_use_names(): void
    {
        $this->actingAs($this->owner);
        Activity::withoutRecording(fn () => Expense::create(['description' => 'Sync', 'amount' => 1, 'date' => '2026-09-10']));
        $this->assertSame(0, ActivityLog::count());

        $this->put('/settings', ['payer1_name' => 'Reni', 'payer2_name' => 'Lua', 'payer1_salary' => 6000, 'payer2_salary' => 4000, 'card_closing_day' => 5]);
        $log = ActivityLog::sole();
        $this->assertSame(['settings', 'editou as configurações'], [$log->area, $log->description]);
        $this->assertContains('Renda de Reni: R$ 0,00 → R$ 6.000,00', $this->lines($log));
    }

    public function test_fixed_expense_and_occurrence_changes(): void
    {
        $this->actingAs($this->member)->post('/fixed-expenses', [
            'description' => 'Energia', 'amount' => 200, 'variable_amount' => true, 'due_day' => 10, 'ownership' => 'both', 'active' => true,
        ]);
        $energia = FixedExpense::firstWhere('description', 'Energia');
        $this->assertSame('criou a conta fixa', ActivityLog::latest('id')->first()->description);

        $this->actingAs($this->member)->put("/fixed-expenses/{$energia->id}/occurrence", ['due_date' => '2026-10-10', 'amount' => 231.4]);
        $log = ActivityLog::latest('id')->first();
        $this->assertSame(['fixed', 'ajustou a cobrança', 'Energia · vence 10/10/2026'], [$log->area, $log->description, $log->subject_label]);
        $this->assertSame(['Valor do mês: — → R$ 231,40'], $this->lines($log));
    }

    public function test_access_changes_and_history_page(): void
    {
        $expense = Expense::create(['description' => 'Pão', 'amount' => 5, 'date' => '2026-09-10', 'ownership' => 'both']);

        $this->actingAs($this->owner)->put("/access/members/{$this->member->id}", ['permissions' => ['expenses.edit', 'goals.edit']]);

        $log = ActivityLog::sole();
        $this->assertSame(['access', 'mudou o que pode fazer', 'Lua'], [$log->area, $log->description, $log->subject_label]);
        $this->assertSame([
            'Lançamentos · excluir: Pode → Não pode',
            'Contas fixas · criar e editar: Pode → Não pode',
            'Metas · criar e editar: Não pode → Pode',
        ], $this->lines($log));

        $this->actingAs($this->member->fresh())->post("/expenses/{$expense->id}/ignore");

        $this->actingAs($this->owner)->get('/history')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('History')
            ->has('entries', 2)
            ->where('entries.0.user_name', 'Lua')
            ->where('entries.0.is_owner', false)
            ->where('entries.0.changes.0.label', 'Tipo')
            ->where('entries.1.is_owner', true)
            ->has('people', 2));

        $this->actingAs($this->owner)->get("/history?user={$this->member->id}")->assertInertia(fn (Assert $page) => $page->has('entries', 1));
        $this->actingAs($this->owner)->get('/history?area=access')->assertInertia(fn (Assert $page) => $page->has('entries', 1)->where('entries.0.area', 'access'));
    }
}
