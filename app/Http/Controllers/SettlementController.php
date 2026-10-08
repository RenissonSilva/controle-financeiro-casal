<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use App\Services\Finance\CycleReport;
use App\Support\ExpensePresenter;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Detalhes do acerto do casal num ciclo: tudo de que o pagador 2 faz parte — gastos dele,
 * compartilhados e contas fixas do próximo ciclo — com quanto cada um soma (ou abate) no acerto.
 */
class SettlementController extends Controller
{
    public function index(Request $request): Response
    {
        $settings = Setting::current();
        $month = $request->get('month');
        $month = is_string($month) && preg_match('/^\d{4}-\d{2}$/', $month) ? $month : $settings->currentCycle();

        $report = CycleReport::for($month, $settings);
        $lines = $report->settlementLines();

        // Contas fixas do próximo ciclo: o acerto deste mês é o dinheiro delas.
        $fixed = $report->settlementFixed()->map(fn (array $item) => [
            'id' => $item['id'],
            'name' => $item['description'],
            'category' => $item['category'],
            'merchant' => $item['merchant'],
            'due_date' => $item['due_date'],
            'amount' => $item['amount'],
            'ownership' => $item['ownership'],
            'status' => $item['status'],
            'paid_at' => $item['payment']['date'] ?? null,
            'estimated' => ! $item['payment'] && $item['variable_amount'] && ! $item['has_amount_override'],
            'payer2_share' => $item['payer2_share'],
        ]);

        return Inertia::render('Settlement', [
            'cycle' => [
                'month' => $month,
                'label' => $report->label(),
                'start' => $report->start->toDateString(),
                'end' => $report->end->toDateString(),
                'previous' => Setting::shiftCycle($month, -1),
                'next' => Setting::shiftCycle($month, 1),
                'is_current' => $month === $settings->currentCycle(),
            ],
            'summary' => [
                'due' => $report->settlementDue(),
                // Separado por quem pagou (não pelo sinal: estorno abate do lado de quem pagou).
                'owed_to_payer1' => round($lines->where('expense.source', '!=', 'payer2')->sum('impact') + $fixed->sum('payer2_share'), 2),
                'owed_to_payer2' => round(-$lines->where('expense.source', 'payer2')->sum('impact'), 2),
            ],
            'lines' => $lines->map(fn (array $line) => [
                ...ExpensePresenter::row($line['expense']),
                'payer1_share' => $line['payer1_share'],
                'payer2_share' => $line['payer2_share'],
                'impact' => $line['impact'],
            ]),
            'fixed' => $fixed,
        ]);
    }
}
