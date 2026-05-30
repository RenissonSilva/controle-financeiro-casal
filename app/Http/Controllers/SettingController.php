<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SettingController extends Controller
{
    public function show(): Response
    {
        $settings = Setting::current();

        return Inertia::render('Settings', [
            'settings' => [
                'payer1_name'    => $settings->payer1_name,
                'payer2_name'    => $settings->payer2_name,
                'payer1_salary'  => $settings->payer1_salary,
                'payer2_salary'  => $settings->payer2_salary,
                'payer1_percent' => $settings->payer1_percent,
                'payer2_percent' => $settings->payer2_percent,
            ],
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'payer1_name'   => ['required', 'string', 'max:100'],
            'payer2_name'   => ['required', 'string', 'max:100'],
            'payer1_salary' => ['required', 'numeric', 'min:0'],
            'payer2_salary' => ['required', 'numeric', 'min:0'],
        ]);

        Setting::current()->update($data);

        return back()->with('success', 'Configurações salvas.');
    }
}
