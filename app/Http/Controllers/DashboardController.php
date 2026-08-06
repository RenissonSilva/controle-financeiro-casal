<?php

namespace App\Http\Controllers;

use App\Models\Expense;
use App\Models\FixedExpense;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(Request $request): Response
    {
        $month    = $request->get('month', now()->format('Y-m'));
        $settings = Setting::current();

        [$rangeStart, $rangeEnd] = $settings->billingCycleRange($month);

        // Busca todas as despesas do ciclo de fatura com categoria.
        $expenses = Expense::with('category')
            ->whereBetween('date', [$rangeStart->toDateString(), $rangeEnd->toDateString()])
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

        // --- Evolução mensal dos últimos 6 ciclos de fatura (para o gráfico de linha) ---
        $monthlyEvolution = collect(range(5, 0))->map(function ($offset) use ($month, $settings) {
            $cycleMonth = Carbon::createFromFormat('Y-m-d', "{$month}-01")->subMonths($offset);

            [$cycleStart, $cycleEnd] = $settings->billingCycleRange($cycleMonth->format('Y-m'));

            $total = Expense::whereBetween('date', [$cycleStart->toDateString(), $cycleEnd->toDateString()])
                ->sum('amount');

            return [
                'month' => $cycleMonth->format('M/y'),
                'total' => round((float) $total, 2),
            ];
        });

        // --- Despesas fixas esperadas no ciclo de fatura selecionado ---
        $fixedExpensesProjection = $this->fixedExpensesForCycle($rangeStart, $rangeEnd);

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
            'fixedExpenses'    => [
                'total' => round($fixedExpensesProjection->sum('amount'), 2),
                'items' => $fixedExpensesProjection->values(),
            ],
        ]);
    }

    /**
     * Projeta as despesas fixas ativas para dentro do ciclo de fatura informado,
     * calculando a data de cobrança de cada uma e se ela ainda está por vir.
     */
    private function fixedExpensesForCycle(Carbon $rangeStart, Carbon $rangeEnd)
    {
        $today  = Carbon::today();
        $months = collect([$rangeStart, $rangeEnd])->map(fn (Carbon $d) => $d->format('Y-m'))->unique();

        return FixedExpense::with('category')
            ->where('active', true)
            ->get()
            ->map(function (FixedExpense $fixedExpense) use ($months, $rangeStart, $rangeEnd, $today) {
                $dueDate = null;

                foreach ($months as $yearMonth) {
                    [$year, $month] = explode('-', $yearMonth);
                    $candidate = $fixedExpense->dueDateFor((int) $year, (int) $month);

                    if ($candidate->between($rangeStart, $rangeEnd)) {
                        $dueDate = $candidate;
                        break;
                    }
                }

                if (! $dueDate) {
                    return null;
                }

                return [
                    'id'          => $fixedExpense->id,
                    'description' => $fixedExpense->description,
                    'amount'      => $fixedExpense->amount,
                    'category'    => $fixedExpense->category?->name,
                    'color'       => $fixedExpense->category?->color ?? '#94a3b8',
                    'ownership'   => $fixedExpense->ownership,
                    'due_date'    => $dueDate->toDateString(),
                    'is_upcoming' => $dueDate->greaterThanOrEqualTo($today),
                ];
            })
            ->filter()
            ->sortBy('due_date');
    }
}
