<?php

namespace App\Http\Controllers;

use App\Models\Expense;
use App\Models\FixedExpense;
use App\Models\Goal;
use App\Models\OpenFinanceInvestment;
use App\Models\OpenFinanceItem;
use App\Models\Setting;
use App\Services\Finance\BalanceHistory;
use App\Services\Finance\CycleReport;
use App\Services\Finance\HealthScore;
use App\Support\ExpensePresenter;
use App\Support\MerchantLogo;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    // Depois disso sem sincronizar, a Home pede uma sincronização ao abrir.
    private const STALE_AFTER_HOURS = 6;

    public function index(Request $request): Response
    {
        $settings = Setting::current();
        $month = $request->get('month');
        $month = is_string($month) && preg_match('/^\d{4}-\d{2}$/', $month) ? $month : $settings->currentCycle();
        $report = CycleReport::for($month, $settings);
        $balances = new BalanceHistory($settings);
        $split = $report->split();

        return Inertia::render('Dashboard', [
            'greetingName' => $settings->payer1_name,
            'cycle' => [
                'month' => $month,
                'label' => $report->label(),
                'start' => $report->start->toDateString(),
                'end' => $report->end->toDateString(),
                'previous' => Setting::shiftCycle($month, -1),
                'next' => Setting::shiftCycle($month, 1),
                'is_current' => $month === $settings->currentCycle(),
            ],
            'health' => (new HealthScore($settings, $balances))->compute(),
            'balance' => $balances->hasData() ? $balances->summary(8) : null,
            'cashFlow' => $report->cashFlow(),
            'goal' => $this->primaryGoal(),
            'upcoming' => $this->upcoming($report),
            'categories' => [
                'items' => $report->byCategory('payer1'),
                'total' => $split['payer1_total'],
            ],
            'history' => Expense::with('category')
                ->whereIn('kind', [Expense::KIND_EXPENSE, Expense::KIND_INCOME, Expense::KIND_SETTLEMENT])
                ->where('date', '<=', Carbon::today()->toDateString())
                ->newestFirst()
                ->limit(20)
                ->get()
                ->map(fn (Expense $e) => ExpensePresenter::row($e)),
            'settlement' => ['due' => $report->settlementDue()],
            'sync' => $this->syncStatus(),
        ]);
    }

    private function primaryGoal(): ?array
    {
        $goal = Goal::orderByDesc('is_primary')->orderBy('id')->first();

        if (! $goal) {
            return null;
        }

        $invested = (float) OpenFinanceInvestment::sum('balance');

        return [
            'id' => $goal->id,
            'name' => $goal->name,
            'target' => $goal->target_amount,
            'current' => round($goal->currentAmount($invested), 2),
            'percent' => $goal->progressPercent($invested),
            'deadline' => $goal->deadline?->toDateString(),
            'tracking' => $goal->tracking,
        ];
    }

    /**
     * Contas fixas deste mês ainda não pagas + a fatura do cartão em aberto.
     */
    private function upcoming(CycleReport $report): Collection
    {
        // Documento do recebedor de cada conta fixa: é por ele que a logo do aluguel é achada.
        $documents = FixedExpense::pluck('match_document', 'id');

        $fixed = $report->fixedExpenses()
            ->where('status', '!=', 'paid')
            ->map(fn (array $item) => [
                'key' => "fixed-{$item['id']}",
                'name' => $item['description'],
                'category' => $item['category'] ?? 'Conta fixa',
                'date' => $item['due_date'],
                'amount' => $item['amount'],
                'status' => $item['status'],
                'estimated' => $item['variable_amount'] && ! $item['has_amount_override'],
                'merchant' => MerchantLogo::forDocument($documents[$item['id']] ?? null) ?? MerchantLogo::match($item['description']),
            ]);

        $bill = $this->openCardBill($report);

        return $fixed->when($bill, fn (Collection $items) => $items->push($bill))->sortBy('date')->values();
    }

    private function openCardBill(CycleReport $report): ?array
    {
        $purchases = $report->expenses()->where('account_type', 'CREDIT');

        if ($purchases->isEmpty()) {
            return null;
        }

        // Vencimento estimado a partir da última fatura conhecida (mesmo dia, meses depois).
        $lastBill = Expense::where('account_type', 'CREDIT')->whereNotNull('bill_due_date')->orderByDesc('bill_due_date')->first(['bill_due_date', 'competence']);
        $dueDate = null;

        if ($lastBill) {
            $months = Carbon::createFromFormat('Y-m', $lastBill->competence)->startOfMonth()
                ->diffInMonths(Carbon::createFromFormat('Y-m', $report->month)->startOfMonth());
            $dueDate = $lastBill->bill_due_date->copy()->addMonthsNoOverflow((int) round($months));
        }

        return [
            'key' => 'card-bill',
            'name' => 'Fatura do cartão',
            'category' => 'Cartão de crédito · em aberto',
            'date' => ($dueDate ?? $report->end->copy()->addDays(8))->toDateString(),
            'amount' => round($purchases->sum(fn (Expense $e) => $e->expenseAmount()), 2),
            'status' => 'open',
            'estimated' => true,
        ];
    }

    private function syncStatus(): array
    {
        $items = OpenFinanceItem::all();
        $last = $items->max('last_synced_at');

        return [
            'has_connection' => $items->isNotEmpty(),
            'last_synced_at' => $last?->toIso8601String(),
            'stale' => $items->isNotEmpty() && (! $last || $last->lt(now()->subHours(self::STALE_AFTER_HOURS))),
            'error' => $items->pluck('last_sync_error')->filter()->first(),
        ];
    }
}
