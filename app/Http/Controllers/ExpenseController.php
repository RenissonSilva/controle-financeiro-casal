<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Expense;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ExpenseController extends Controller
{
    public function index(Request $request): Response
    {
        $month    = $request->get('month', now()->format('Y-m'));
        $activeTab = $request->get('tab', 'payer1');
        $settings  = Setting::current();

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
}
