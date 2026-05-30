<?php

namespace App\Http\Controllers;

use App\Models\Expense;
use App\Models\Setting;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(Request $request): Response
    {
        $month    = $request->get('month', now()->format('Y-m'));
        $year     = (int) substr($month, 0, 4);
        $monthNum = (int) substr($month, 5, 2);

        $settings = Setting::current();

        // Busca todas as despesas do mês com categoria.
        $expenses = Expense::with('category')
            ->whereYear('date', $year)
            ->whereMonth('date', $monthNum)
            ->get();

        // --- Totais por dono ---
        $totalPayer1 = $expenses->where('ownership', 'payer1')->sum('amount');
        $totalPayer2 = $expenses->where('ownership', 'payer2')->sum('amount');
        $totalShared = $expenses->where('ownership', 'both')->sum('amount');

        /*
         * Rateio dos gastos compartilhados pela proporção de renda.
         * Ex: renda1=6000, renda2=4000 → p1=60%, p2=40%
         * Se totalShared=1000 → p1 paga 600, p2 paga 400.
         */
        $p1Ratio = $settings->payer1_percent / 100;
        $p2Ratio = $settings->payer2_percent / 100;

        $sharedForPayer1 = round($totalShared * $p1Ratio, 2);
        $sharedForPayer2 = round($totalShared * $p2Ratio, 2);

        $grandTotalPayer1 = round($totalPayer1 + $sharedForPayer1, 2);
        $grandTotalPayer2 = round($totalPayer2 + $sharedForPayer2, 2);

        // --- Gastos por categoria (para o gráfico de pizza) ---
        $byCategory = $expenses
            ->groupBy('category_id')
            ->map(function ($group) {
                $first = $group->first();
                return [
                    'name'  => $first->category?->name ?? 'Sem categoria',
                    'color' => $first->category?->color ?? '#94a3b8',
                    'value' => round($group->sum('amount'), 2),
                ];
            })
            ->values();

        // --- Evolução mensal dos últimos 6 meses (para o gráfico de linha) ---
        $monthlyEvolution = collect(range(5, 0))->map(function ($offset) use ($year, $monthNum) {
            $date  = now()->setYear($year)->setMonth($monthNum)->subMonths($offset);
            $total = Expense::whereYear('date', $date->year)
                ->whereMonth('date', $date->month)
                ->sum('amount');

            return [
                'month' => $date->format('M/y'),
                'total' => round((float) $total, 2),
            ];
        });

        return Inertia::render('Dashboard', [
            'month'    => $month,
            'settings' => [
                'payer1_name'    => $settings->payer1_name,
                'payer2_name'    => $settings->payer2_name,
                'payer1_percent' => $settings->payer1_percent,
                'payer2_percent' => $settings->payer2_percent,
            ],
            'summary' => [
                'total'             => round($expenses->sum('amount'), 2),
                'payer1_individual' => round($totalPayer1, 2),
                'payer2_individual' => round($totalPayer2, 2),
                'shared_total'      => round($totalShared, 2),
                'payer1_shared'     => $sharedForPayer1,
                'payer2_shared'     => $sharedForPayer2,
                'payer1_grand'      => $grandTotalPayer1,
                'payer2_grand'      => $grandTotalPayer2,
            ],
            'byCategory'       => $byCategory,
            'monthlyEvolution' => $monthlyEvolution,
        ]);
    }
}
