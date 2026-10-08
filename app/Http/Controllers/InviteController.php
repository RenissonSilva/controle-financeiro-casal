<?php

namespace App\Http\Controllers;

use App\Models\Invite;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Lado de quem recebe o convite: abrir o link (logado ou não), aceitar, e a tela de quem
 * tem conta mas ainda não está vinculado.
 */
class InviteController extends Controller
{
    public function show(Request $request, string $token): Response
    {
        $invite = Invite::findValid($token);
        $user = $request->user();

        // Sem login: guarda o convite para depois do cadastro/entrada (ver Invite::SESSION_KEY).
        if ($invite && ! $user) {
            $request->session()->put(Invite::SESSION_KEY, $token);
        }

        return Inertia::render('Auth/Invite', [
            'token' => $token,
            'valid' => (bool) $invite,
            'ownerName' => $invite?->creator?->name,
            'state' => match (true) {
                ! $user => 'guest',
                $user->isOwner() => 'owner',
                $user->isMember() => 'member',
                default => 'unlinked',
            },
        ]);
    }

    public function accept(Request $request, string $token): RedirectResponse
    {
        $invite = Invite::findValid($token);

        if (! $invite || ! $invite->accept($request->user())) {
            return back()->with('error', 'Este convite não vale mais. Peça um link novo para a conta principal.');
        }

        return redirect()->route('dashboard')->with('success', 'Conta vinculada! Você já pode ver as finanças do casal.');
    }

    // Conta criada sem convite (ou desvinculada): não vê nada até entrar por um link.
    public function pending(Request $request): Response|RedirectResponse
    {
        if ($request->user()->isLinked()) {
            return redirect()->route('dashboard');
        }

        return Inertia::render('Auth/NotLinked');
    }
}
