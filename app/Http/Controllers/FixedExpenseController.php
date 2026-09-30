<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Expense;
use App\Models\FixedExpense;
use App\Models\FixedExpenseOverride;
use App\Models\Setting;
use App\Services\Finance\CycleReport;
use App\Services\Finance\FixedExpenseMatcher;
use App\Support\ExpensePresenter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class FixedExpenseController extends Controller
{
    public function index(Request $request): Response
    {
        $settings = Setting::current();
        $month = $request->get('month');
        $month = is_string($month) && preg_match('/^\d{4}-\d{2}$/', $month) ? $month : $settings->currentCycle();
        $report = CycleReport::for($month, $settings);
        $projection = $report->fixedExpenses()->keyBy('id');

        return Inertia::render('FixedExpenses', [
            'cycle' => [
                'month' => $month,
                'label' => $report->label(),
                'start' => $report->start->toDateString(),
                'end' => $report->end->toDateString(),
                'previous' => Setting::shiftCycle($month, -1),
                'next' => Setting::shiftCycle($month, 1),
                'is_current' => $month === $settings->currentCycle(),
            ],
            'fixedExpenses' => FixedExpense::with('category')
                ->orderByDesc('active')
                ->orderBy('due_day')
                ->get()
                ->map(fn (FixedExpense $expense) => [
                    'id' => $expense->id,
                    'description' => $expense->description,
                    'amount' => $expense->amount,
                    'variable_amount' => $expense->variable_amount,
                    'due_day' => $expense->due_day,
                    'start_date' => $expense->start_date?->toDateString(),
                    'end_date' => $expense->end_date?->toDateString(),
                    'category_id' => $expense->category_id,
                    'category' => $expense->category?->name,
                    'color' => $expense->category?->color,
                    'ownership' => $expense->ownership,
                    'match_document' => $expense->match_document,
                    'match_pattern' => $expense->match_pattern,
                    'active' => $expense->active,
                    'occurrence' => $projection->get($expense->id),
                ]),
            'totals' => [
                'planned' => round($projection->sum('amount'), 2),
                'paid' => round($projection->where('status', 'paid')->sum('amount'), 2),
                'pending' => $report->pendingFixed(),
            ],
            'payees' => $this->payees(),
            'categories' => Category::orderBy('name')->get(['id', 'name', 'color']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validateFixedExpense($request);

        // Sem data inicial, a conta vale a partir do mês atual (não aparece em meses passados).
        $data['start_date'] ??= Setting::current()->billingCycleRange(Setting::current()->currentCycle())[0]->toDateString();

        $fixedExpense = FixedExpense::create($data);
        $linked = $this->rematch($fixedExpense);

        return back()->with('success', 'Conta fixa criada.'.($linked ? " {$linked} pagamento(s) reconhecido(s)." : ''));
    }

    public function update(Request $request, FixedExpense $fixedExpense): RedirectResponse
    {
        $data = $this->validateFixedExpense($request);
        $matcherChanged = $data['match_document'] !== $fixedExpense->match_document || $data['match_pattern'] !== $fixedExpense->match_pattern;

        $fixedExpense->update($data);

        // Mudou a forma de reconhecer: desfaz os vínculos e reconhece de novo com o critério novo
        // (os que o usuário desfez na mão continuam bloqueados).
        if ($matcherChanged) {
            $fixedExpense->occurrences()->where('skip_auto_match', false)->whereNotNull('expense_id')->update(['expense_id' => null]);
        }

        $linked = $this->rematch($fixedExpense);

        return back()->with('success', 'Conta fixa atualizada.'.($linked ? " {$linked} pagamento(s) reconhecido(s)." : ''));
    }

    public function destroy(FixedExpense $fixedExpense): RedirectResponse
    {
        $fixedExpense->delete();

        return back()->with('success', 'Conta fixa removida. Os pagamentos continuam em Lançamentos.');
    }

    // Registra (ou atualiza) o valor real de uma cobrança específica de uma conta de valor
    // variável, sem alterar a estimativa base cadastrada.
    public function updateOccurrence(Request $request, FixedExpense $fixedExpense): RedirectResponse
    {
        $data = $request->validate([
            'due_date' => ['required', 'date'],
            'amount' => ['required', 'numeric', 'min:0.01'],
        ]);

        $fixedExpense->occurrences()->updateOrCreate(
            ['due_date' => $data['due_date']],
            ['amount' => $data['amount']]
        );

        return back()->with('success', 'Valor do mês atualizado.');
    }

    // Remove o ajuste de valor de um mês específico, voltando a usar a estimativa base.
    public function destroyOccurrence(FixedExpenseOverride $occurrence): RedirectResponse
    {
        if ($occurrence->expense_id || $occurrence->skip_auto_match) {
            $occurrence->update(['amount' => null]);
        } else {
            $occurrence->delete();
        }

        return back()->with('success', 'Valor restaurado para a estimativa.');
    }

    /**
     * Lançamentos do mês que podem ser o pagamento desta conta (para vincular na mão).
     */
    public function candidates(Request $request, FixedExpense $fixedExpense): JsonResponse
    {
        $month = $request->validate(['month' => ['required', 'regex:/^\d{4}-\d{2}$/']])['month'];

        $rows = Expense::with('category')
            ->ofKind(Expense::KIND_EXPENSE)
            ->where('direction', 'out')
            ->inCompetence($month)
            ->whereDoesntHave('fixedOccurrence')
            ->get()
            ->sortBy(fn (Expense $e) => [FixedExpenseMatcher::matches($fixedExpense, $e) ? 0 : 1, abs($e->amount - $fixedExpense->amount)])
            ->take(30)
            ->values()
            ->map(fn (Expense $e) => ExpensePresenter::row($e));

        return response()->json(['rows' => $rows]);
    }

    public function link(Request $request, FixedExpense $fixedExpense): RedirectResponse
    {
        $data = $request->validate([
            'month' => ['required', 'regex:/^\d{4}-\d{2}$/'],
            'expense_id' => ['required', 'integer', 'exists:expenses,id'],
        ]);

        $occurrence = $this->occurrenceFor($fixedExpense, $data['month']);
        FixedExpenseOverride::where('expense_id', $data['expense_id'])->update(['expense_id' => null]);
        $occurrence->fill(['expense_id' => $data['expense_id'], 'skip_auto_match' => false])->save();
        FixedExpenseMatcher::make()->applyFixedCategory($fixedExpense, Expense::findOrFail($data['expense_id']));

        return back()->with('success', 'Pagamento vinculado.');
    }

    public function unlink(Request $request, FixedExpense $fixedExpense): RedirectResponse
    {
        $data = $request->validate(['month' => ['required', 'regex:/^\d{4}-\d{2}$/']]);

        $this->occurrenceFor($fixedExpense, $data['month'])
            ->fill(['expense_id' => null, 'skip_auto_match' => true])
            ->save();

        return back()->with('success', 'Vínculo desfeito — essa cobrança não será mais vinculada automaticamente.');
    }

    private function occurrenceFor(FixedExpense $fixedExpense, string $month): FixedExpenseOverride
    {
        [$start, $end] = Setting::current()->billingCycleRange($month);
        $dueDate = $fixedExpense->dueDateInRange($start, $end);

        abort_unless($dueDate, 422, 'Essa conta fixa não tem cobrança nesse mês.');

        return FixedExpenseOverride::firstOrNew([
            'fixed_expense_id' => $fixedExpense->id,
            'due_date' => $dueDate->toDateString(),
        ]);
    }

    // Vincula pagamentos de todo o histórico (desde a data inicial da conta, se houver).
    private function rematch(FixedExpense $fixedExpense): int
    {
        if (! $fixedExpense->active || ! $fixedExpense->hasPaymentMatcher()) {
            return 0;
        }

        $from = $fixedExpense->start_date ?? Carbon::parse(Expense::min('date') ?? now());
        $to = $fixedExpense->end_date && $fixedExpense->end_date->lt(now()) ? $fixedExpense->end_date : Carbon::today()->addMonth();

        return FixedExpenseMatcher::make()->matchBetween(Carbon::parse($from), Carbon::parse($to));
    }

    /**
     * Destinatários frequentes de Pix/transferência (com CPF/CNPJ) — sugestões para
     * "Como reconhecer o pagamento".
     */
    private function payees(): array
    {
        return Expense::query()
            ->where('origin', 'open_finance')
            ->where('direction', 'out')
            ->where('kind', Expense::KIND_EXPENSE)
            ->whereNotNull('counterparty_document')
            ->where('date', '>=', now()->subMonths(6)->toDateString())
            ->get(['counterparty_document', 'counterparty_name', 'description', 'amount', 'date'])
            ->groupBy('counterparty_document')
            ->map(function ($rows, string $document) {
                $latest = $rows->sortByDesc('date')->first();

                return [
                    'document' => $document,
                    'name' => $latest->counterparty_name ?? ExpensePresenter::splitDescription($latest->description)[1],
                    'count' => $rows->count(),
                    'last_amount' => $latest->amount,
                    'last_date' => $latest->date->toDateString(),
                ];
            })
            ->filter(fn (array $payee) => $payee['count'] >= 2)
            ->sortByDesc('count')
            ->take(30)
            ->values()
            ->all();
    }

    private function validateFixedExpense(Request $request): array
    {
        $data = $request->validate([
            'description' => ['required', 'string', 'max:255'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'variable_amount' => ['boolean'],
            'due_day' => ['required', 'integer', 'min:1', 'max:31'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'category_id' => ['nullable', 'exists:categories,id'],
            'ownership' => ['required', 'in:payer1,payer2,both'],
            'match_document' => ['nullable', 'string', 'max:32'],
            'match_pattern' => ['nullable', 'string', 'max:255'],
            'active' => ['boolean'],
        ]);

        $data['match_document'] = preg_replace('/\D/', '', (string) ($data['match_document'] ?? '')) ?: null;
        $data['match_pattern'] = trim((string) ($data['match_pattern'] ?? '')) ?: null;

        return $data;
    }
}
