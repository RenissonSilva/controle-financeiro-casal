<?php

namespace App\Http\Middleware;

use App\Models\Setting;
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
            ],
            // Mensagens de back()->with('success'|'error', ...) — sem isso elas nunca
            // chegavam às telas (usePage().props.flash ficava sempre vazio).
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
            ],
            'couple' => fn () => $request->user() ? $this->couple() : null,
        ];
    }

    // Nomes usados no layout (avatar, rótulos "Reni / Lua / Nós").
    private function couple(): array
    {
        $settings = Setting::current();

        return [
            'payer1_name' => $settings->payer1_name,
            'payer2_name' => $settings->payer2_name,
            'payer1_percent' => $settings->payer1_percent,
            'payer2_percent' => $settings->payer2_percent,
        ];
    }
}
