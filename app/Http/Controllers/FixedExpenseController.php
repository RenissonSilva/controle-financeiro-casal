<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\FixedExpense;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class FixedExpenseController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('FixedExpenses', [
            'fixedExpenses' => FixedExpense::with('category')
                ->orderBy('due_day')
                ->get()
                ->map(fn (FixedExpense $expense) => [
                    'id'          => $expense->id,
                    'description' => $expense->description,
                    'amount'      => $expense->amount,
                    'due_day'     => $expense->due_day,
                    'category_id' => $expense->category_id,
                    'category'    => $expense->category?->name,
                    'ownership'   => $expense->ownership,
                    'active'      => $expense->active,
                ]),
            'categories' => Category::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validateFixedExpense($request);

        FixedExpense::create($data);

        return back()->with('success', 'Despesa fixa criada com sucesso.');
    }

    public function update(Request $request, FixedExpense $fixedExpense): RedirectResponse
    {
        $data = $this->validateFixedExpense($request);

        $fixedExpense->update($data);

        return back()->with('success', 'Despesa fixa atualizada com sucesso.');
    }

    public function destroy(FixedExpense $fixedExpense): RedirectResponse
    {
        $fixedExpense->delete();

        return back()->with('success', 'Despesa fixa removida.');
    }

    private function validateFixedExpense(Request $request): array
    {
        return $request->validate([
            'description' => ['required', 'string', 'max:255'],
            'amount'      => ['required', 'numeric', 'min:0.01'],
            'due_day'     => ['required', 'integer', 'min:1', 'max:31'],
            'category_id' => ['nullable', 'exists:categories,id'],
            'ownership'   => ['required', 'in:payer1,payer2,both'],
            'active'      => ['boolean'],
        ]);
    }
}
