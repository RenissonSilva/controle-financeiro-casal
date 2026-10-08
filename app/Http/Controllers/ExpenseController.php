<?php

namespace App\Http\Controllers;

use App\Models\CategorizationRule;
use App\Models\Category;
use App\Models\Expense;
use App\Models\FixedExpense;
use App\Models\FixedExpenseOverride;
use App\Models\NameRule;
use App\Models\OpenFinanceItem;
use App\Models\Setting;
use App\Services\Categorization\Categorizer;
use App\Services\Finance\CycleReport;
use App\Services\Finance\FixedExpenseMatcher;
use App\Services\OpenFinance\TransactionClassifier;
use App\Support\Activity;
use App\Support\ExpensePresenter;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ExpenseController extends Controller
{
    public function index(Request $request): Response
    {
        $settings = Setting::current();
        $month = $request->get('month');
        $month = is_string($month) && preg_match('/^\d{4}-\d{2}$/', $month) ? $month : $settings->currentCycle();

        $report = CycleReport::for($month, $settings);
        $rows = Expense::with(['category', 'fixedOccurrence.fixedExpense', 'nameRule'])
            ->inCompetence($month)
            ->newestFirst()
            ->get();

        return Inertia::render('Expenses', [
            'cycle' => [
                'month' => $month,
                'label' => $report->label(),
                'start' => $report->start->toDateString(),
                'end' => $report->end->toDateString(),
                'previous' => Setting::shiftCycle($month, -1),
                'next' => Setting::shiftCycle($month, 1),
                'is_current' => $month === $settings->currentCycle(),
            ],
            'availableMonths' => $this->availableMonths($settings),
            'rows' => $rows->map(fn (Expense $e) => ExpensePresenter::row($e)),
            'summary' => [
                'split' => $report->split(),
                'cash_flow' => $report->cashFlow(),
                'settlement' => ['due' => $report->settlementDue()],
                'by_category' => $report->byCategory('couple'),
                'pending_fixed' => $report->pendingFixed(),
            ],
            'categories' => Category::orderBy('name')->get(['id', 'name', 'color', 'default_ownership']),
            'fixedExpenses' => FixedExpense::where('active', true)->orderBy('description')->get(['id', 'description']),
            'lastSyncedAt' => OpenFinanceItem::max('last_synced_at'),
            'hasConnection' => OpenFinanceItem::exists(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validateManual($request);
        $fixedExpenseId = $data['fixed_expense_id'] ?? null;
        unset($data['fixed_expense_id']);

        $expense = Expense::create([
            ...$data,
            'direction' => $this->directionFor($data['kind'], $request->input('settlement_direction')),
            'origin' => 'manual',
            'status' => 'categorized',
            'category_source' => 'user',
            'kind_locked' => true,
        ]);

        $this->linkFixed($expense, $fixedExpenseId);

        return back()->with('success', 'Lançamento adicionado.');
    }

    /**
     * Edita um lançamento. Do banco (Open Finance) dá para mudar observação, categoria,
     * quem paga, o tipo e dar um nome personalizado; descrição, valor e data vêm do banco
     * e não mudam. Lançamento manual pode ser editado por inteiro.
     */
    public function update(Request $request, Expense $expense): RedirectResponse
    {
        $rules = [
            'notes' => ['nullable', 'string', 'max:1000'],
            'category_id' => ['nullable', 'integer', 'exists:categories,id'],
            'ownership' => ['required', 'in:payer1,payer2,both'],
            'kind' => ['required', Rule::in(Expense::KINDS)],
            'fixed_expense_id' => ['nullable', 'integer', 'exists:fixed_expenses,id'],
            'ownership_scope' => ['nullable', 'in:one,all'],
        ];

        if ($expense->isFromOpenFinance()) {
            $rules['custom_name'] = ['nullable', 'string', 'max:255'];
            $rules['name_pattern'] = ['nullable', 'string', 'max:255', function ($attribute, $value, $fail) use ($expense) {
                if (! (new NameRule(['pattern' => $value]))->matches($expense->description)) {
                    $fail('O filtro não pega este lançamento — use % para "qualquer texto" (ex: Amazon %).');
                }
            }];
        } else {
            $rules += [
                'description' => ['required', 'string', 'max:255'],
                'amount' => ['required', 'numeric', 'min:0.01'],
                'date' => ['required', 'date'],
                'source' => ['required', 'in:payer1,payer2'],
            ];
        }

        $data = $request->validate($rules);
        $fixedExpenseId = $data['fixed_expense_id'] ?? null;
        $scope = $data['ownership_scope'] ?? null;
        unset($data['fixed_expense_id'], $data['ownership_scope']);

        // O nome vale para todos os lançamentos que batem com o filtro, de agora e dos próximos meses.
        $renamed = null;

        if (array_key_exists('custom_name', $data)) {
            $name = trim((string) $data['custom_name']) ?: null;
            $pattern = trim((string) ($data['name_pattern'] ?? '')) ?: NameRule::exactPattern($expense->description);
            $current = $expense->nameRule;

            if ($name !== $current?->name || ($name && $pattern !== $current?->pattern)) {
                $renamed = $expense->rename($name, $pattern);
            }

            unset($data['custom_name'], $data['name_pattern']);
        }

        $kindChanged = $data['kind'] !== $expense->kind;
        $expense->fill($data);

        if ($expense->isDirty(['category_id', 'ownership'])) {
            $expense->category_source = 'user';
            $expense->status = 'categorized';
        }

        // "Só este": as próximas cobranças não herdam esse dono. "Todos": vira o padrão do estabelecimento.
        // Só repropaga quando o dono ou a escolha mudam — salvar de novo sem mexer não refaz nada.
        $ownershipForAll = false;

        if ($scope && $expense->kind === Expense::KIND_EXPENSE && ($expense->isDirty('ownership') || $scope !== ($expense->ownership_scope ?? 'one'))) {
            $expense->ownership_scope = $scope;
            $ownershipForAll = $scope === 'all';
        }

        if ($kindChanged) {
            $expense->kind_locked = true;
            $expense->kind_reason = $expense->kind === Expense::KIND_IGNORED ? 'user' : null;
        }

        // No manual, o sentido do dinheiro segue o tipo (e, no acerto, quem pagou quem).
        if (! $expense->isFromOpenFinance()) {
            $expense->direction = $this->directionFor($expense->kind, $request->input('settlement_direction'), $expense->direction);
        }

        $expense->save();
        $this->linkFixed($expense, $fixedExpenseId);

        $messages = [];

        if ($renamed && ($count = $renamed->expenses()->count()) > 1) {
            $messages[] = "nome aplicado a {$count} lançamentos";
        }

        if ($ownershipForAll && ($count = $this->applyOwnershipToSimilar($expense)) > 0) {
            $messages[] = "dono aplicado a mais {$count} ".($count === 1 ? 'lançamento' : 'lançamentos');
            Activity::record('expenses', 'propagated', "repetiu \"de quem é\" em mais {$count} ".($count === 1 ? 'lançamento' : 'lançamentos').' do mesmo estabelecimento', Activity::expenseLabel($expense), $expense, [
                Activity::change('ownership', 'De quem é', null, Activity::format('payer', $expense->ownership)),
            ]);
        }

        return back()->with('success', 'Lançamento atualizado'.($messages ? ' — '.implode('; ', $messages) : '').'.');
    }

    /**
     * Repete "de quem é o gasto" nas despesas do mesmo estabelecimento deste mês em diante.
     * As próximas cobranças seguem pela memória do categorizador (este lançamento vira a referência).
     * Meses anteriores ficam como estão, para não mexer em acertos já feitos.
     */
    private function applyOwnershipToSimilar(Expense $expense): int
    {
        $key = Categorizer::memoryKey($expense);

        $ids = Expense::query()
            ->where('kind', Expense::KIND_EXPENSE)
            ->where('competence', '>=', $expense->competence)
            ->whereKeyNot($expense->id)
            ->get(['id', 'description', 'counterparty_document', 'ownership', 'ownership_scope'])
            ->filter(fn (Expense $e) => Categorizer::memoryKey($e) === $key)
            ->filter(fn (Expense $e) => $e->ownership !== $expense->ownership || $e->ownership_scope !== 'all')
            ->pluck('id');

        Expense::whereIn('id', $ids)->update(['ownership' => $expense->ownership, 'ownership_scope' => 'all']);

        return $ids->count();
    }

    // "Tirar dos cálculos" / "Voltar a contar": atalho da lista, sem abrir o formulário.
    public function toggleIgnore(Expense $expense): RedirectResponse
    {
        if ($expense->kind !== Expense::KIND_IGNORED) {
            $expense->update(['kind' => Expense::KIND_IGNORED, 'kind_reason' => 'user', 'kind_locked' => true]);

            return back()->with('success', 'Lançamento ignorado — não entra mais nos cálculos.');
        }

        if ($expense->isFromOpenFinance()) {
            // Volta para a classificação automática, refeita a partir dos dados do banco.
            $classifier = new TransactionClassifier($expense->openFinanceItem?->owner_document);
            $class = $classifier->classify($expense->only([
                'description', 'amount', 'direction', 'bank_category', 'counterparty_name', 'counterparty_document', 'account_type',
            ]), CategorizationRule::all());

            // Se a classificação automática também ignora, "restaurar" significa contar como despesa/receita.
            if ($class['kind'] === Expense::KIND_IGNORED) {
                $class = ['kind' => $expense->direction === 'in' ? Expense::KIND_INCOME : Expense::KIND_EXPENSE, 'kind_reason' => null];
                $expense->kind_locked = true;
            } else {
                $expense->kind_locked = false;
            }

            $expense->fill($class)->save();
        } else {
            $expense->update(['kind' => $expense->direction === 'in' ? Expense::KIND_INCOME : Expense::KIND_EXPENSE, 'kind_reason' => null]);
        }

        if ($expense->kind === Expense::KIND_EXPENSE && ! $expense->category_id) {
            $expense->update(['status' => 'pending']);
            Activity::withoutRecording(fn () => app(Categorizer::class)->applyLocal([$expense->id]));
        }

        return back()->with('success', 'Lançamento voltou a contar nos cálculos.');
    }

    /**
     * Salva em lote as mudanças de categoria/quem paga feitas na lista.
     * Payload: { expenses: [{ id, category_id, ownership }] }
     */
    public function batchUpdate(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'expenses'               => ['required', 'array'],
            'expenses.*.id'          => ['required', 'integer', 'exists:expenses,id'],
            'expenses.*.category_id' => ['nullable', 'integer', 'exists:categories,id'],
            'expenses.*.ownership'   => ['required', 'in:payer1,payer2,both'],
        ]);

        // Um a um (e não update em massa) para cada mudança entrar no histórico.
        $expenses = Expense::findMany(collect($data['expenses'])->pluck('id'))->keyBy('id');

        foreach ($data['expenses'] as $item) {
            $expenses[$item['id']]->update([
                'category_id' => $item['category_id'] ?? null,
                'ownership' => $item['ownership'],
                'category_source' => 'user',
                'status' => 'categorized',
            ]);
        }

        $count = count($data['expenses']);

        return back()->with('success', $count === 1 ? '1 lançamento salvo.' : "{$count} lançamentos salvos.");
    }

    /**
     * Categoriza com IA os lançamentos escolhidos (ou todos sem categoria do mês).
     * Roda na hora — regras e memória antes, IA só no que sobrar.
     */
    public function categorize(Request $request, Categorizer $categorizer): JsonResponse
    {
        $data = $request->validate([
            'ids'   => ['required', 'array', 'min:1', 'max:500'],
            'ids.*' => ['required', 'integer', 'exists:expenses,id'],
        ]);

        set_time_limit(300);

        $ids = Expense::whereIn('id', $data['ids'])
            ->where('kind', Expense::KIND_EXPENSE)
            ->pluck('id')
            ->all();

        // Pedido explícito: a IA pode revisar inclusive o que foi escolhido à mão.
        Expense::whereIn('id', $ids)->update(['status' => 'pending', 'category_source' => null]);
        Activity::withoutRecording(fn () => $categorizer->applyAi($categorizer->applyLocal($ids)));
        Activity::record('expenses', 'categorized', 'categorizou com IA '.count($ids).' '.(count($ids) === 1 ? 'lançamento' : 'lançamentos'));

        return response()->json(['message' => count($ids).' lançamento(s) categorizados.']);
    }

    // Só lançamentos manuais podem ser apagados; os do banco voltariam na próxima sincronização.
    public function destroy(Expense $expense): RedirectResponse
    {
        if ($expense->isFromOpenFinance()) {
            return back()->with('error', 'Lançamentos do banco não podem ser apagados — use "Ignorar".');
        }

        $expense->delete();

        return back()->with('success', 'Lançamento removido.');
    }

    /**
     * Exporta as despesas dos meses escolhidos em PDF, uma página por mês.
     * Payload: { months: ['2026-06', ...], ownerships: ['payer1', 'both', ...] }
     */
    public function exportPdf(Request $request): HttpResponse
    {
        $data = $request->validate([
            'months'        => ['required', 'array', 'min:1'],
            'months.*'      => ['required', 'regex:/^\d{4}-\d{2}$/'],
            'ownerships'    => ['required', 'array', 'min:1'],
            'ownerships.*'  => ['required', 'in:payer1,payer2,both'],
        ]);

        $settings = Setting::current();
        $allOwnerships = ['payer1', 'payer2', 'both'];
        $ownerships = array_values(array_unique($data['ownerships']));
        $isFiltered = count($ownerships) < count($allOwnerships);

        $ownershipLabels = [
            'payer1' => $settings->payer1_name,
            'payer2' => $settings->payer2_name,
            'both'   => 'Compartilhado',
        ];

        $pages = collect($data['months'])->unique()->sort()->values()->map(function (string $month) use ($ownerships, $settings) {
            $report = CycleReport::for($month, $settings);
            $rows = $report->expenses()->whereIn('ownership', $ownerships)->reverse()->values();

            return [
                'month' => $month,
                'label' => $report->label(),
                'range' => $report->start->format('d/m/Y').' a '.$report->end->format('d/m/Y'),
                'rows'  => $rows,
                'total' => round($rows->sum(fn (Expense $e) => $e->expenseAmount()), 2),
                'split' => $report->split(),
            ];
        });

        $scopeLabel = $isFiltered
            ? collect($ownerships)->map(fn ($o) => $ownershipLabels[$o])->join(' + ')
            : "Total ({$settings->payer1_name} + {$settings->payer2_name})";

        $pdf = Pdf::loadView('pdf.expenses', [
            'pages'           => $pages,
            'scopeLabel'      => $scopeLabel,
            'ownershipLabels' => $ownershipLabels,
            'settings'        => $settings,
            'showSplit'       => ! $isFiltered,
            'generatedAt'     => now()->format('d/m/Y H:i'),
        ]);

        return $pdf->download('despesas.pdf');
    }

    private function availableMonths(Setting $settings): array
    {
        return Expense::query()
            ->distinct()
            ->pluck('competence')
            ->push($settings->currentCycle())
            ->filter()
            ->unique()
            ->sortDesc()
            ->values()
            ->all();
    }

    private function validateManual(Request $request): array
    {
        return $request->validate([
            'description'      => ['required', 'string', 'max:255'],
            'amount'           => ['required', 'numeric', 'min:0.01'],
            'date'             => ['required', 'date'],
            'kind'             => ['required', Rule::in([Expense::KIND_EXPENSE, Expense::KIND_INCOME, Expense::KIND_SETTLEMENT])],
            'category_id'      => ['nullable', 'integer', 'exists:categories,id'],
            'ownership'        => ['required', 'in:payer1,payer2,both'],
            'source'           => ['required', 'in:payer1,payer2'],
            'notes'            => ['nullable', 'string', 'max:1000'],
            'fixed_expense_id' => ['nullable', 'integer', 'exists:fixed_expenses,id'],
        ]);
    }

    /**
     * Sentido do dinheiro de um lançamento manual. Acerto: 'in' = o pagador 2 pagou o
     * pagador 1; 'out' = o contrário.
     */
    private function directionFor(string $kind, ?string $settlementDirection, string $default = 'out'): string
    {
        return match ($kind) {
            Expense::KIND_INCOME => 'in',
            Expense::KIND_SETTLEMENT => $settlementDirection === 'out' ? 'out' : 'in',
            Expense::KIND_EXPENSE => 'out',
            default => $default,
        };
    }

    /**
     * Marca (ou desmarca) o lançamento como o pagamento de uma conta fixa no mês dele.
     */
    private function linkFixed(Expense $expense, ?int $fixedExpenseId): void
    {
        $current = $expense->fixedOccurrence()->first();

        if ($current && $current->fixed_expense_id === $fixedExpenseId) {
            return;
        }

        if ($current) {
            // Desfeito pelo usuário: não deixa a sincronização refazer esse vínculo.
            $current->update(['expense_id' => null, 'skip_auto_match' => true]);
        }

        if (! $fixedExpenseId) {
            return;
        }

        // A cobrança é a que vence no ciclo da data do pagamento (sem o deslocamento de conta do mês anterior).
        $fixedExpense = FixedExpense::findOrFail($fixedExpenseId);
        [$start, $end] = Setting::current()->billingCycleRange(Setting::shiftCycle($expense->competence, -$expense->competence_shift));
        $dueDate = $fixedExpense->dueDateInRange($start, $end) ?? $expense->date;

        $occurrence = FixedExpenseOverride::firstOrNew([
            'fixed_expense_id' => $fixedExpense->id,
            'due_date' => $dueDate->toDateString(),
        ]);

        // Se outro lançamento já pagava essa cobrança, ele perde o vínculo.
        $occurrence->fill(['expense_id' => $expense->id, 'skip_auto_match' => false])->save();
        FixedExpenseMatcher::make()->applyFixedCategory($fixedExpense, $expense->fresh());
    }
}
