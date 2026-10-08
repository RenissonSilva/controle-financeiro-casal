<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->web(append: [
            \App\Http\Middleware\HandleInertiaRequests::class,
            \Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets::class,
        ]);

        $middleware->alias([
            'linked' => \App\Http\Middleware\EnsureAccountIsLinked::class,
        ]);

        // Na Vercel tudo chega pelo proxy dela (HTTPS e IP real nos X-Forwarded-*).
        if (env('VERCEL')) {
            $middleware->trustProxies(at: '*');
        }
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*'),
        );

        // Ação sem permissão (conta vinculada sem a área liberada) vinda de uma tela do Inertia:
        // volta para a tela com o aviso, em vez da página de erro 403.
        $exceptions->respond(function (Response $response, Throwable $e, Request $request) {
            if ($response->getStatusCode() === 403 && $request->header('X-Inertia') && ! $request->isMethodSafe()) {
                return back()->with('error', 'Você não tem permissão para isso. Peça para a conta principal liberar.');
            }

            return $response;
        });
    })->create();
