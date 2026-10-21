<?php

namespace Tests\Feature\Chat;

use App\Models\ActivityLog;
use App\Models\Expense;
use App\Models\PendingOwnership;
use App\Models\Setting;
use App\Models\User;
use App\Services\Chat\ChatBot;
use App\Services\Finance\CycleReport;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class ChatBotTest extends TestCase
{
    use RefreshDatabase;

    private User $owner;

    private User $member;

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow('2026-10-21 10:00:00');
        config(['services.whatsapp.token' => null]);
        $this->owner = User::factory()->create(['name' => 'Reni']);
        $this->member = User::factory()->member(['expenses.edit'])->create(['name' => 'Lua']);
        Setting::current()->update(['payer1_name' => 'Reni', 'payer2_name' => 'Lua']);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    private function bot(User $sender, string $text): string
    {
        return app(ChatBot::class)->reply($sender, $text);
    }

    // Cobrança vinda do banco: no cartão `date` é o dia da fatura, `occurred_at` o da compra.
    private function charge(string $description, string $occurredAt, float $amount = 20, array $attributes = []): Expense
    {
        return Expense::create([
            'description' => $description,
            'amount' => $amount,
            'date' => substr($occurredAt, 0, 10),
            'occurred_at' => $occurredAt,
            'origin' => 'open_finance',
            'ownership' => 'both',
            'category_source' => 'ai',
            ...$attributes,
        ]);
    }

    public function test_single_match_changes_the_owner_of_that_charge_only(): void
    {
        $uber = $this->charge('Uber *Trip', '2026-10-20 19:02:00', 23.5);
        $older = $this->charge('Uber *Trip', '2026-10-18 08:00:00');

        $reply = $this->bot($this->owner, 'uber de ontem meu');

        $this->assertSame("✅ Uber *Trip · R$ 23,50 · 20/10 às 19:02\nDe quem é: Nós → Reni", $reply);
        $uber->refresh();
        $this->assertSame(['payer1', 'one', 'user', 'categorized'], [$uber->ownership, $uber->ownership_scope, $uber->category_source, $uber->status]);
        $this->assertSame('both', $older->fresh()->ownership);
    }

    public function test_card_charge_is_found_by_purchase_day_and_dela_is_the_other_one(): void
    {
        // Comprado ontem à noite, lançado na fatura amanhã.
        $uber = $this->charge('Uber *Trip', '2026-10-20 23:10:00', 18, ['date' => '2026-10-22', 'account_type' => 'CREDIT']);

        $reply = $this->bot($this->member, 'uber de ontem dele');

        $this->assertStringContainsString('De quem é: Nós → Reni', $reply);
        $this->assertSame('payer1', $uber->fresh()->ownership);
    }

    public function test_several_matches_ask_which_one(): void
    {
        $lunch = $this->charge('Ifood *Restaurante', '2026-10-20 12:00:00', 45.9);
        $dinner = $this->charge('Ifood *Pizzaria', '2026-10-20 21:00:00', 60);

        $reply = $this->bot($this->owner, 'ifood de ontem dela');

        $this->assertStringContainsString("Achei 2 cobranças de \"ifood\" em 20/10:\n1) Ifood *Pizzaria · R$ 60,00 · 20/10 às 21:00\n2) Ifood *Restaurante", $reply);
        $this->assertSame('both', $lunch->fresh()->ownership);

        $this->assertStringContainsString('De quem é: Nós → Lua', $this->bot($this->owner, '2'));
        $this->assertSame(['payer2', 'both'], [$lunch->fresh()->ownership, $dinner->fresh()->ownership]);

        // A pergunta só vale uma vez.
        $this->assertStringStartsWith('Não tenho nenhuma pergunta em aberto', $this->bot($this->owner, '1'));
    }

    public function test_answer_all_and_invalid_number(): void
    {
        $this->charge('Ifood *Restaurante', '2026-10-20 12:00:00');
        $this->charge('Ifood *Pizzaria', '2026-10-20 21:00:00');

        $this->bot($this->owner, 'ifood de ontem nosso dela');
        $this->assertSame('Responda com um número de 1 a 2 ou "todos".', $this->bot($this->owner, '3'));

        $this->bot($this->owner, 'todos');
        $this->assertSame(2, Expense::where('ownership', 'payer2')->count());
    }

    public function test_amount_narrows_the_match(): void
    {
        $lunch = $this->charge('Ifood *Restaurante', '2026-10-20 12:00:00', 45.9);
        $this->charge('Ifood *Pizzaria', '2026-10-20 21:00:00', 60);

        $this->assertStringStartsWith('✅ Ifood *Restaurante', $this->bot($this->owner, 'ifood 45,90 ontem nosso, não, dela'));
        $this->assertSame('payer2', $lunch->fresh()->ownership);
    }

    public function test_charge_that_did_not_arrive_yet_is_applied_when_it_syncs(): void
    {
        $reply = $this->bot($this->member, 'drogasil de hoje meu');

        $this->assertSame('Ainda não chegou do banco nenhuma cobrança de "drogasil" em 21/10. Quando chegar, marco como "Lua" (vale até 26/10).', $reply);
        $this->assertSame(0, PendingOwnership::applyAll());

        // Chega na sincronização seguinte (e outra farmácia não é afetada).
        $drogasil = $this->charge('Drogasil 2345 Salvador', '2026-10-21 09:30:00', 32.9);
        $other = $this->charge('Pague Menos', '2026-10-21 09:40:00');

        $this->assertSame(1, PendingOwnership::applyAll());
        $drogasil->refresh();
        $this->assertSame(['payer2', 'one', 'user'], [$drogasil->ownership, $drogasil->ownership_scope, $drogasil->category_source]);
        $this->assertSame('both', $other->fresh()->ownership);

        // O histórico registra quem pediu.
        $log = ActivityLog::sole();
        $this->assertSame([$this->member->id, 'editou o lançamento'], [$log->user_id, $log->description]);
        $this->assertSame('Lua', $log->changes[0]['new']);

        // Já aplicado: não mexe de novo.
        $drogasil->update(['ownership' => 'both']);
        $this->assertSame(0, PendingOwnership::applyAll());
    }

    public function test_expired_pending_is_dropped(): void
    {
        $this->bot($this->owner, 'drogasil de hoje dela');
        Carbon::setTestNow('2026-10-27 10:00:00');
        $drogasil = $this->charge('Drogasil 2345', '2026-10-21 09:30:00');

        $this->assertSame(0, PendingOwnership::applyAll());
        $this->assertSame(0, PendingOwnership::count());
        $this->assertSame('both', $drogasil->fresh()->ownership);
    }

    public function test_old_charge_not_found_does_not_wait(): void
    {
        $reply = $this->bot($this->owner, 'uber de 01/09 meu');

        $this->assertStringStartsWith('Não achei nenhuma cobrança de "uber" em 01/09', $reply);
        $this->assertSame(0, PendingOwnership::count());
    }

    public function test_member_without_permission_can_only_ask_the_settlement(): void
    {
        $viewer = User::factory()->member()->create(['name' => 'Lua']);
        $uber = $this->charge('Uber *Trip', '2026-10-20 19:02:00');

        $this->assertStringContainsString('não tem permissão', $this->bot($viewer, 'uber de ontem meu'));
        $this->assertSame('both', $uber->fresh()->ownership);
        $this->assertStringStartsWith('Acerto de', $this->bot($viewer, 'quanto a lua deve?'));
    }

    public function test_settlement_is_the_one_from_the_current_cycle(): void
    {
        // Reni pagou algo só da Lua.
        Expense::create(['description' => 'Presente', 'amount' => 100, 'date' => '2026-10-20', 'ownership' => 'payer2', 'source' => 'payer1']);
        $report = CycleReport::for(Setting::current()->currentCycle());

        $this->assertSame(100.0, $report->settlementDue());
        $this->assertSame("Acerto de {$report->label()} (até agora): Lua deve R$ 100,00 para Reni.", $this->bot($this->owner, 'Quanto a Lua deve?'));
    }

    public function test_unknown_text_gets_help(): void
    {
        $this->assertStringStartsWith('Oi! Pra mudar de quem é uma cobrança', $this->bot($this->owner, 'bom dia'));
        $this->assertStringStartsWith('Qual cobrança?', $this->bot($this->owner, 'de ontem meu'));
    }
}
