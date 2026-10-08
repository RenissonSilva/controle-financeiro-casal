<?php

namespace App\Http\Middleware;

use App\Models\OpenFinanceItem;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'auth' => [
                'user' => $request->user(),
                // O que a conta pode fazer ({ "expenses.edit": true, ..., "owner": false }) — as telas
                // escondem o que não pode; o servidor barra de qualquer jeito (rotas com can:).
                'can' => fn () => $request->user()?->abilities() ?? [],
                'owner_name' => fn () => $request->user()?->isMember() ? User::owner()?->name : null,
            ],
            // Mensagens de back()->with('success'|'error', ...) — sem isso elas nunca
            // chegavam às telas (usePage().props.flash ficava sempre vazio).
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
            ],
            // Conta ainda não vinculada não vê nem os nomes do casal.
            'couple' => fn () => $request->user()?->isLinked() ? $this->couple() : null,
        ];
    }

    // Nomes usados no layout (avatar, rótulos "Reni / Lua / Nós").
    private function couple(): array
    {
        $settings = Setting::current();
        $lastSynced = OpenFinanceItem::max('last_synced_at');

        return [
            'payer1_name' => $settings->payer1_name,
            'payer2_name' => $settings->payer2_name,
            'payer1_percent' => $settings->payer1_percent,
            'payer2_percent' => $settings->payer2_percent,
            // Rodapé da sidebar ("Sincronizado há 1 h").
            'last_synced_at' => $lastSynced ? Carbon::parse($lastSynced)->toIso8601String() : null,
        ];
    }
}
