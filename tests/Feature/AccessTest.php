<?php

namespace Tests\Feature;

use App\Models\Expense;
use App\Models\Goal;
use App\Models\Invite;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class AccessTest extends TestCase
{
    use RefreshDatabase;

    private const INERTIA = ['X-Inertia' => 'true'];

    public function test_first_account_becomes_owner_and_the_next_ones_need_an_invite(): void
    {
        $this->post('/register', ['name' => 'Reni', 'email' => 'reni@example.com', 'password' => 'password', 'password_confirmation' => 'password'])
            ->assertRedirect('/dashboard');
        $this->assertTrue(User::firstWhere('email', 'reni@example.com')->isOwner());

        $this->post('/logout');

        $this->get('/register')->assertInertia(fn (Assert $page) => $page->component('Auth/Register')->where('inviteOnly', true));
        $this->post('/register', ['name' => 'Estranho', 'email' => 'x@example.com', 'password' => 'password', 'password_confirmation' => 'password'])
            ->assertRedirect('/register');
        $this->assertDatabaseMissing('users', ['email' => 'x@example.com']);
    }

    public function test_invite_link_creates_a_view_only_linked_account(): void
    {
        $owner = User::factory()->create(['name' => 'Reni']);
        $invite = Invite::generate($owner);
        $expense = Expense::create(['description' => 'Mercado', 'amount' => 10, 'date' => '2026-09-10', 'ownership' => 'both']);

        $this->get("/convite/{$invite->token}")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('Auth/Invite')->where('valid', true)->where('state', 'guest')->where('ownerName', 'Reni'))
            ->assertSessionHas(Invite::SESSION_KEY, $invite->token);

        $this->get('/register')->assertInertia(fn (Assert $page) => $page->where('inviteOnly', false)->where('invitedBy', 'Reni'));
        $this->post('/register', ['name' => 'Lua', 'email' => 'lua@example.com', 'password' => 'password', 'password_confirmation' => 'password'])
            ->assertRedirect('/dashboard');

        $member = User::firstWhere('email', 'lua@example.com');
        $this->assertTrue($member->isMember());
        $this->assertSame([], $member->permissions);
        $this->assertSame($member->id, $invite->fresh()->accepted_by);

        // Vê tudo...
        foreach (['/dashboard', '/expenses', '/fixed-expenses', '/goals', '/settlement', '/settings'] as $url) {
            $this->actingAs($member)->get($url)->assertOk();
        }

        $this->actingAs($member)->get('/settings')->assertInertia(fn (Assert $page) => $page
            ->where('access', null)
            ->where('auth.can', fn ($can) => collect($can)->filter()->isEmpty() && $can->has('expenses.edit'))
            ->where('auth.owner_name', 'Reni'));

        // ...mas não muda nada.
        $this->actingAs($member)->withHeaders(self::INERTIA)->from('/expenses')
            ->put("/expenses/{$expense->id}", ['description' => 'Outro', 'amount' => 99, 'date' => '2026-09-10', 'source' => 'payer1', 'ownership' => 'payer2', 'kind' => 'expense'])
            ->assertRedirect('/expenses')
            ->assertSessionHas('error');
        $this->assertSame('Mercado', $expense->fresh()->description);
        $this->flushHeaders();

        $this->actingAs($member)->delete("/expenses/{$expense->id}")->assertForbidden();
        $this->actingAs($member)->post('/goals', ['name' => 'Viagem', 'target_amount' => 1000, 'tracking' => 'manual'])->assertForbidden();
        $this->actingAs($member)->put('/settings', ['payer1_name' => 'X', 'payer2_name' => 'Y', 'payer1_salary' => 1, 'payer2_salary' => 1, 'card_closing_day' => 5])->assertForbidden();

        // Histórico e acesso são só da conta principal.
        $this->actingAs($member)->get('/history')->assertForbidden();
        $this->actingAs($member)->post('/access/invites')->assertForbidden();
        $this->actingAs($member)->put("/access/members/{$member->id}", ['permissions' => User::permissionKeys()])->assertForbidden();
    }

    public function test_owner_frees_each_area_separately(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->member()->create();
        $expense = Expense::create(['description' => 'Feira', 'amount' => 10, 'date' => '2026-09-10', 'ownership' => 'both', 'origin' => 'manual']);
        $goal = Goal::create(['name' => 'Viagem', 'target_amount' => 1000, 'tracking' => 'manual']);

        $this->actingAs($owner)->put("/access/members/{$member->id}", ['permissions' => ['expenses.edit', 'goals.delete']])
            ->assertSessionHas('success');
        $this->assertSame(['expenses.edit', 'goals.delete'], $member->fresh()->permissions);

        $this->actingAs($member->fresh())->put("/expenses/{$expense->id}", [
            'description' => 'Feira livre', 'amount' => 10, 'date' => '2026-09-10', 'source' => 'payer1', 'ownership' => 'payer2', 'kind' => 'expense',
        ])->assertSessionHas('success');
        $this->assertSame('Feira livre', $expense->fresh()->description);

        $this->actingAs($member->fresh())->delete("/expenses/{$expense->id}")->assertForbidden();
        $this->actingAs($member->fresh())->put("/goals/{$goal->id}", ['name' => 'X', 'target_amount' => 5, 'tracking' => 'manual'])->assertForbidden();
        $this->actingAs($member->fresh())->delete("/goals/{$goal->id}")->assertSessionHas('success');
        $this->assertNull($goal->fresh());

        // Tirar a permissão vale na hora.
        $this->actingAs($owner)->put("/access/members/{$member->id}", ['permissions' => []]);
        $this->actingAs($member->fresh())->post("/expenses/{$expense->id}/ignore")->assertForbidden();

        // Permissão inventada não passa.
        $this->actingAs($owner)->put("/access/members/{$member->id}", ['permissions' => ['tudo']])->assertSessionHasErrors('permissions.0');
    }

    public function test_account_without_link_sees_nothing(): void
    {
        User::factory()->create();
        $stranger = User::factory()->unlinked()->create();

        $this->actingAs($stranger)->get('/dashboard')->assertRedirect(route('access.pending'));
        $this->actingAs($stranger)->get('/expenses')->assertRedirect(route('access.pending'));
        $this->actingAs($stranger)->postJson('/expenses/categorize', ['ids' => [1]])->assertForbidden();
        $this->actingAs($stranger)->get('/aguardando-vinculo')->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('Auth/NotLinked')->where('couple', null));

        // Conta vinculada que abre a tela de espera vai para a Home.
        $this->actingAs(User::factory()->member()->create())->get('/aguardando-vinculo')->assertRedirect(route('dashboard'));
    }

    public function test_logged_in_account_accepts_invite_and_expired_or_used_links_fail(): void
    {
        $owner = User::factory()->create();
        $stranger = User::factory()->unlinked()->create();
        $invite = Invite::generate($owner);

        $this->actingAs($stranger)->get("/convite/{$invite->token}")->assertInertia(fn (Assert $page) => $page->where('state', 'unlinked')->where('valid', true));
        $this->actingAs($stranger)->post("/convite/{$invite->token}")->assertRedirect(route('dashboard'));
        $this->assertTrue($stranger->fresh()->isMember());

        // Uso único.
        $other = User::factory()->unlinked()->create();
        $this->actingAs($other)->post("/convite/{$invite->token}")->assertSessionHas('error');
        $this->assertFalse($other->fresh()->isLinked());

        // Expirado.
        $expired = Invite::generate($owner);
        $expired->forceFill(['expires_at' => now()->subMinute()])->save();
        $this->actingAs($other)->get("/convite/{$expired->token}")->assertInertia(fn (Assert $page) => $page->where('valid', false));
        $this->actingAs($other)->post("/convite/{$expired->token}")->assertSessionHas('error');

        // Gerar outro link invalida o anterior.
        $first = Invite::generate($owner);
        Invite::generate($owner);
        $this->assertNull(Invite::findValid($first->token));
    }

    public function test_login_after_opening_invite_links_the_account(): void
    {
        $owner = User::factory()->create();
        $lua = User::factory()->unlinked()->create(['email' => 'lua@example.com']);
        $invite = Invite::generate($owner);

        $this->get("/convite/{$invite->token}");
        $this->post('/login', ['email' => 'lua@example.com', 'password' => 'password'])->assertRedirect('/dashboard');

        $this->assertTrue($lua->fresh()->isMember());
    }

    public function test_owner_manages_invites_and_unlinks_members(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->member(['expenses.edit'])->create();

        $this->actingAs($owner)->post('/access/invites')->assertSessionHas('success');
        $invite = Invite::pending()->sole();

        $this->actingAs($owner)->get('/settings')->assertInertia(fn (Assert $page) => $page
            ->where('access.invite.url', route('invites.show', $invite->token))
            ->has('access.members', 1)
            ->where('access.members.0.permissions', ['expenses.edit']));

        $this->actingAs($owner)->delete("/access/invites/{$invite->id}")->assertSessionHas('success');
        $this->assertSame(0, Invite::count());

        $this->actingAs($owner)->delete("/access/members/{$member->id}")->assertSessionHas('success');
        $this->assertFalse($member->fresh()->isLinked());
        $this->actingAs($member->fresh())->get('/dashboard')->assertRedirect(route('access.pending'));

        // A conta principal não se desvincula por aqui.
        $this->actingAs($owner)->delete("/access/members/{$owner->id}")->assertNotFound();
    }
}
