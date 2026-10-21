<?php

namespace Tests\Feature;

use App\Models\ActivityLog;
use App\Models\Expense;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request as ClientRequest;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class WhatsAppWebhookTest extends TestCase
{
    use RefreshDatabase;

    private User $owner;

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow('2026-10-21 10:00:00');
        config(['services.whatsapp' => [
            'token' => 'token',
            'phone_number_id' => '123',
            'app_secret' => 'segredo',
            'verify_token' => 'verifica',
            'graph_version' => 'v25.0',
        ]]);
        $this->owner = User::factory()->create(['name' => 'Reni', 'whatsapp' => '5571999998888']);
        Setting::current()->update(['payer1_name' => 'Reni', 'payer2_name' => 'Lua']);
        Http::fake();
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    private function message(string $from, string $text, string $id = 'wamid.1'): array
    {
        return ['object' => 'whatsapp_business_account', 'entry' => [['changes' => [['field' => 'messages', 'value' => [
            'messages' => [['from' => $from, 'id' => $id, 'type' => 'text', 'text' => ['body' => $text]]],
        ]]]]]];
    }

    private function webhook(array $payload, ?string $signature = null): TestResponse
    {
        $body = json_encode($payload);

        return $this->call('POST', '/webhooks/whatsapp', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_X_HUB_SIGNATURE_256' => $signature ?? 'sha256='.hash_hmac('sha256', $body, 'segredo'),
        ], $body);
    }

    public function test_route_does_not_exist_without_token(): void
    {
        config(['services.whatsapp.token' => null]);

        $this->get('/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=verifica&hub.challenge=42')->assertNotFound();
        $this->webhook($this->message('5571999998888', 'oi'))->assertNotFound();
    }

    public function test_meta_verifies_the_address(): void
    {
        $this->get('/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=verifica&hub.challenge=42')->assertOk()->assertSeeText('42');
        $this->get('/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=outro&hub.challenge=42')->assertForbidden();
    }

    public function test_bad_signature_is_rejected(): void
    {
        $this->webhook($this->message('5571999998888', 'oi'), 'sha256=errado')->assertUnauthorized();
        $this->webhook($this->message('5571999998888', 'oi'), '')->assertUnauthorized();

        Http::assertNothingSent();
    }

    public function test_message_changes_the_owner_and_replies(): void
    {
        $uber = Expense::create(['description' => 'Uber *Trip', 'amount' => 23.5, 'date' => '2026-10-20', 'occurred_at' => '2026-10-20 19:02:00', 'origin' => 'open_finance']);

        // A Meta pode mandar o número sem o 9 do celular.
        $this->webhook($this->message('557199998888', 'uber de ontem dela'))->assertOk();

        $this->assertSame('payer2', $uber->fresh()->ownership);
        Http::assertSent(fn (ClientRequest $request) => $request->url() === 'https://graph.facebook.com/v25.0/123/messages'
            && $request->hasHeader('Authorization', 'Bearer token')
            && $request['to'] === '557199998888'
            && $request['text']['body'] === "✅ Uber *Trip · R$ 23,50 · 20/10 às 19:02\nDe quem é: Nós → Lua");

        // Fica no histórico em nome de quem mandou.
        $log = ActivityLog::sole();
        $this->assertSame([$this->owner->id, 'editou o lançamento'], [$log->user_id, $log->description]);
    }

    public function test_unknown_number_and_unlinked_account_are_ignored(): void
    {
        User::factory()->unlinked()->create(['whatsapp' => '5511988887777']);

        $this->webhook($this->message('5511911112222', 'oi', 'wamid.1'))->assertOk();
        $this->webhook($this->message('5511988887777', 'oi', 'wamid.2'))->assertOk();

        Http::assertNothingSent();
    }

    public function test_same_message_is_handled_once(): void
    {
        $this->webhook($this->message('5571999998888', 'oi'))->assertOk();
        $this->webhook($this->message('5571999998888', 'oi'))->assertOk();

        Http::assertSentCount(1);
    }

    public function test_status_updates_are_ignored(): void
    {
        $this->webhook(['entry' => [['changes' => [['value' => ['statuses' => [['id' => 'wamid.1', 'status' => 'read']]]]]]]])->assertOk();

        Http::assertNothingSent();
    }

    public function test_profile_saves_the_number_in_the_webhook_format(): void
    {
        $this->actingAs($this->owner)->patch('/profile', ['name' => 'Reni', 'email' => $this->owner->email, 'whatsapp' => '(71) 98888-7777'])
            ->assertSessionHasNoErrors();
        $this->assertSame('5571988887777', $this->owner->fresh()->whatsapp);

        $lua = User::factory()->member()->create();
        $this->actingAs($lua)->patch('/profile', ['name' => 'Lua', 'email' => $lua->email, 'whatsapp' => '71 98888-7777'])
            ->assertSessionHasErrors(['whatsapp' => 'Esse número já está em outra conta.']);
        $this->actingAs($lua)->patch('/profile', ['name' => 'Lua', 'email' => $lua->email, 'whatsapp' => '9999'])
            ->assertSessionHasErrors('whatsapp');
    }
}
