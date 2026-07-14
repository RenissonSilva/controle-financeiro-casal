<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Expense;
use App\Models\Setting;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Inertia\Inertia;
use Inertia\Response;

class ExpenseController extends Controller
{
    public function index(Request $request): Response
    {
        $month    = $request->get('month', now()->format('Y-m'));
        $activeTab = $request->get('tab', 'payer1');
        $settings  = Setting::current();

        $availableMonths = Expense::orderBy('date', 'desc')
            ->pluck('date')
            ->map(fn ($date) => $date->format('Y-m'))
            ->unique()
            ->values();

        $serialize = fn ($e) => [
            'id'          => $e->id,
            'description' => $e->description,
            'amount'      => $e->amount,
            'date'        => $e->date->format('Y-m-d'),
            'ownership'   => $e->ownership,
            'source'      => $e->source,
            'status'      => $e->status,
            'category_id' => $e->category_id,
            'category'    => $e->category?->name,
        ];

        $query = Expense::with('category')
            ->whereYear('date', substr($month, 0, 4))
            ->whereMonth('date', substr($month, 5, 2))
            ->orderBy('date', 'desc');

        // Duas coleções separadas por source para alimentar as abas.
        $payer1Expenses = (clone $query)->where('source', 'payer1')->get()->map($serialize)->values();
        $payer2Expenses = (clone $query)->where('source', 'payer2')->get()->map($serialize)->values();

        $hasPending = $payer1Expenses->contains('status', 'pending')
                   || $payer2Expenses->contains('status', 'pending');

        return Inertia::render('Expenses', [
            'payer1Expenses' => $payer1Expenses,
            'payer2Expenses' => $payer2Expenses,
            'categories'     => Category::orderBy('name')->get(['id', 'name', 'color']),
            'month'          => $month,
            'activeTab'      => in_array($activeTab, ['payer1', 'payer2']) ? $activeTab : 'payer1',
            'hasPending'     => $hasPending,
            'availableMonths' => $availableMonths,
            'settings'       => [
                'payer1_name' => $settings->payer1_name,
                'payer2_name' => $settings->payer2_name,
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'description' => ['required', 'string', 'max:255'],
            'amount'      => ['required', 'numeric', 'min:0.01'],
            'date'        => ['required', 'date'],
            'category_id' => ['nullable', 'integer', 'exists:categories,id'],
            'ownership'   => ['required', 'in:payer1,payer2,both'],
            'source'      => ['required', 'in:payer1,payer2'],
        ]);

        $expense = Expense::create([...$data, 'status' => 'categorized']);
        $expense->load('category');

        return response()->json([
            'id'          => $expense->id,
            'description' => $expense->description,
            'amount'      => $expense->amount,
            'date'        => $expense->date->format('Y-m-d'),
            'ownership'   => $expense->ownership,
            'source'      => $expense->source,
            'status'      => $expense->status,
            'category_id' => $expense->category_id,
            'category'    => $expense->category?->name,
        ], 201);
    }

    /**
     * Batch update: recebe array de alterações e persiste de uma vez.
     * Payload: { expenses: [{ id, category_id, ownership }] }
     */
    public function batchUpdate(Request $request): JsonResponse
    {
        $request->validate([
            'expenses'               => ['required', 'array'],
            'expenses.*.id'          => ['required', 'integer', 'exists:expenses,id'],
            'expenses.*.category_id' => ['nullable', 'integer', 'exists:categories,id'],
            'expenses.*.ownership'   => ['required', 'in:payer1,payer2,both'],
        ]);

        foreach ($request->expenses as $item) {
            Expense::where('id', $item['id'])->update([
                'category_id' => $item['category_id'] ?? null,
                'ownership'   => $item['ownership'],
            ]);
        }

        return response()->json(['message' => 'Despesas atualizadas com sucesso.']);
    }

    public function destroy(Expense $expense): RedirectResponse
    {
        $expense->delete();
        return back()->with('success', 'Despesa removida.');
    }

    public function destroyByMonth(string $month, string $source): RedirectResponse
    {
        if (!preg_match('/^\d{4}-\d{2}$/', $month) || !in_array($source, ['payer1', 'payer2'])) {
            abort(422);
        }

        Expense::whereYear('date', substr($month, 0, 4))
            ->whereMonth('date', substr($month, 5, 2))
            ->where('source', $source)
            ->delete();

        return back()->with('success', 'Todos os registros do mês foram removidos.');
    }

    /**
     * Exporta as despesas selecionadas em PDF, uma página por mês.
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

        $months = collect($data['months'])->sort()->values();

        $pages = $months->map(function (string $month) use ($ownerships) {
            $rows = Expense::with('category')
                ->whereYear('date', substr($month, 0, 4))
                ->whereMonth('date', substr($month, 5, 2))
                ->whereIn('ownership', $ownerships)
                ->orderBy('date')
                ->get();

            return [
                'month' => $month,
                'label' => ucfirst(\Carbon\Carbon::createFromFormat('Y-m', $month)->locale('pt_BR')->translatedFormat('F \d\e Y')),
                'rows'  => $rows,
                'total' => $rows->sum('amount'),
            ];
        });

        $scopeLabel = $isFiltered
            ? collect($ownerships)->map(fn ($o) => $ownershipLabels[$o])->join(' + ')
            : "Total ({$settings->payer1_name} + {$settings->payer2_name})";

        $pdf = Pdf::loadView('pdf.expenses', [
            'pages'           => $pages,
            'scopeLabel'      => $scopeLabel,
            'ownershipLabels' => $ownershipLabels,
            'generatedAt'     => now()->format('d/m/Y H:i'),
        ]);

        return $pdf->download('despesas.pdf');
    }
}
