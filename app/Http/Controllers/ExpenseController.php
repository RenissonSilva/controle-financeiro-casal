<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Expense;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ExpenseController extends Controller
{
    public function index(Request $request): Response
    {
        $month = $request->get('month', now()->format('Y-m'));

        $expenses = Expense::with('category')
            ->whereYear('date', substr($month, 0, 4))
            ->whereMonth('date', substr($month, 5, 2))
            ->orderBy('date', 'desc')
            ->get()
            ->map(fn ($e) => [
                'id'          => $e->id,
                'description' => $e->description,
                'amount'      => $e->amount,
                'date'        => $e->date->format('Y-m-d'),
                'ownership'   => $e->ownership,
                'status'      => $e->status,
                'category_id' => $e->category_id,
                'category'    => $e->category?->name,
            ]);

        $hasPending = $expenses->contains('status', 'pending');

        return Inertia::render('Expenses', [
            'expenses'   => $expenses,
            'categories' => Category::orderBy('name')->get(['id', 'name', 'color']),
            'month'      => $month,
            'hasPending' => $hasPending,
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
        ]);

        $expense = Expense::create([
            ...$data,
            'status' => 'categorized',
        ]);

        $expense->load('category');

        return response()->json([
            'id'          => $expense->id,
            'description' => $expense->description,
            'amount'      => $expense->amount,
            'date'        => $expense->date->format('Y-m-d'),
            'ownership'   => $expense->ownership,
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
