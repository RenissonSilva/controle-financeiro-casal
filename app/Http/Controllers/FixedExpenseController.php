<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\FixedExpense;
use App\Models\FixedExpenseOverride;
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
                    'id' => $expense->id,
                    'description' => $expense->description,
                    'amount' => $expense->amount,
                    'variable_amount' => $expense->variable_amount,
                    'due_day' => $expense->due_day,
                    'start_date' => $expense->start_date?->toDateString(),
                    'end_date' => $expense->end_date?->toDateString(),
                    'category_id' => $expense->category_id,
                    'category' => $expense->category?->name,
                    'ownership' => $expense->ownership,
                    'active' => $expense->active,
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

    // Registra (ou atualiza) o valor real de uma cobrança específica de uma despesa de valor
    // variável, sem alterar a estimativa base cadastrada na despesa fixa.
    public function updateOccurrence(Request $request, FixedExpense $fixedExpense): RedirectResponse
    {
        $data = $request->validate([
            'due_date' => ['required', 'date'],
            'amount' => ['required', 'numeric', 'min:0.01'],
        ]);

        $fixedExpense->overrides()->updateOrCreate(
            ['due_date' => $data['due_date']],
            ['amount' => $data['amount']]
        );

        return back()->with('success', 'Valor da cobrança atualizado.');
    }

    // Remove o ajuste de um mês específico, voltando a usar a estimativa base.
    public function destroyOccurrence(FixedExpenseOverride $occurrence): RedirectResponse
    {
        $occurrence->delete();

        return back()->with('success', 'Valor restaurado para a estimativa.');
    }

    private function validateFixedExpense(Request $request): array
    {
        return $request->validate([
            'description' => ['required', 'string', 'max:255'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'variable_amount' => ['boolean'],
            'due_day' => ['required', 'integer', 'min:1', 'max:31'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'category_id' => ['nullable', 'exists:categories,id'],
            'ownership' => ['required', 'in:payer1,payer2,both'],
            'active' => ['boolean'],
        ]);
    }
}
