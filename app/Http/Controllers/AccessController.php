<?php

namespace App\Http\Controllers;

use App\Models\Invite;
use App\Models\User;
use App\Support\Activity;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Acesso compartilhado (só a conta principal): link de convite, o que cada conta vinculada
 * pode fazer e desvincular. A seção fica em Configurações.
 */
class AccessController extends Controller
{
    // Dados da seção "Acesso compartilhado" de Configurações.
    public static function section(): array
    {
        $invite = Invite::pending()->latest('id')->first();

        return [
            'members' => User::where('role', User::ROLE_MEMBER)->orderBy('linked_at')->get()->map(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'linked_at' => $user->linked_at?->toIso8601String(),
                'permissions' => array_values($user->permissions ?? []),
            ]),
            'invite' => $invite ? [
                'id' => $invite->id,
                'url' => $invite->url(),
                'expires_at' => $invite->expires_at->toIso8601String(),
            ] : null,
            'areas' => collect(User::AREAS)->map(fn (string $label, string $key) => ['key' => $key, 'label' => $label])->values(),
            'actions' => collect(User::ACTIONS)->map(fn (string $label, string $key) => ['key' => $key, 'label' => $label])->values(),
        ];
    }

    public function invite(Request $request): RedirectResponse
    {
        Invite::generate($request->user());
        Activity::record('access', 'invited', 'gerou um link de convite');

        return back()->with('success', 'Link de convite criado — vale por '.Invite::VALID_DAYS.' dias e para uma conta.');
    }

    public function revokeInvite(Invite $invite): RedirectResponse
    {
        abort_if($invite->accepted_at, 404);

        $invite->delete();
        Activity::record('access', 'revoked', 'cancelou o link de convite');

        return back()->with('success', 'Link de convite cancelado.');
    }

    // O que a conta vinculada pode fazer, por área (ver User::AREAS).
    public function update(Request $request, User $member): RedirectResponse
    {
        abort_unless($member->isMember(), 404);

        $data = $request->validate([
            'permissions' => ['present', 'array'],
            'permissions.*' => ['string', Rule::in(User::permissionKeys())],
        ]);

        $before = $member->permissions ?? [];
        $after = array_values(array_unique($data['permissions']));
        $changes = [];

        foreach (User::permissionKeys() as $permission) {
            $had = in_array($permission, $before, true);
            $has = in_array($permission, $after, true);

            if ($had !== $has) {
                [$area, $action] = explode('.', $permission);
                $label = User::AREAS[$area].' · '.mb_strtolower(User::ACTIONS[$action]);
                $changes[] = Activity::change($permission, $label, $had ? 'Pode' : 'Não pode', $has ? 'Pode' : 'Não pode');
            }
        }

        if ($changes) {
            $member->forceFill(['permissions' => $after])->save();
            Activity::record('access', 'permissions', 'mudou o que pode fazer', $member->name, $member, $changes);
        }

        return back()->with('success', "Permissões de {$member->name} salvas.");
    }

    public function destroy(User $member): RedirectResponse
    {
        abort_unless($member->isMember(), 404);

        $member->unlink();
        Activity::record('access', 'unlinked', 'desvinculou a conta', $member->name, $member);

        return back()->with('success', "Conta de {$member->name} desvinculada — não vê mais os dados.");
    }
}
