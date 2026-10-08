<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Os dados são do casal, não de cada conta: só a conta principal e as vinculadas por convite
 * entram. Conta criada sem convite fica na tela de "aguardando vínculo".
 */
class EnsureAccountIsLinked
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && ! $user->isLinked()) {
            return $request->expectsJson()
                ? response()->json(['message' => 'Conta ainda não vinculada.'], 403)
                : redirect()->route('access.pending');
        }

        return $next($request);
    }
}
