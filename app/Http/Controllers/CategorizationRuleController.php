<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\CategorizationRule;
use App\Models\Expense;
use App\Models\Setting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CategorizationRuleController extends Controller
{
    public function index(): Response
    {
        $settings = Setting::current();

        return Inertia::render('CategorizationRules', [
            'rules' => CategorizationRule::with('category')
                ->orderBy('pattern')
                ->get()
                ->map(fn (CategorizationRule $rule) => [
                    'id'          => $rule->id,
                    'pattern'     => $rule->pattern,
                    'amount'      => $rule->amount,
                    'category_id' => $rule->category_id,
                    'category'    => $rule->category->name,
                    'ownership'   => $rule->ownership,
                ]),
            'categories' => Category::orderBy('name')->get(['id', 'name', 'color']),
            'settings'   => [
                'payer1_name' => $settings->payer1_name,
                'payer2_name' => $settings->payer2_name,
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validateRule($request);

        CategorizationRule::create($data);

        return back()->with('success', 'Regra criada com sucesso.');
    }

    public function update(Request $request, CategorizationRule $categorizationRule): RedirectResponse
    {
        $data = $this->validateRule($request);

        $categorizationRule->update($data);

        return back()->with('success', 'Regra atualizada com sucesso.');
    }

    public function destroy(CategorizationRule $categorizationRule): RedirectResponse
    {
        $categorizationRule->delete();

        return back()->with('success', 'Regra removida.');
    }

    /**
     * Reaplica todas as regras às despesas já existentes (de qualquer status),
     * sobrescrevendo categoria e pagador de quem bater com alguma regra.
     */
    public function apply(): RedirectResponse
    {
        $applied = 0;

        Expense::all()->each(function (Expense $expense) use (&$applied) {
            $rule = CategorizationRule::matchFor($expense->description, $expense->amount);

            if (!$rule) {
                return;
            }

            $expense->update([
                'category_id' => $rule->category_id,
                'ownership'   => $rule->ownership,
                'status'      => 'categorized',
            ]);

            $applied++;
        });

        return back()->with(
            'success',
            $applied > 0
                ? "{$applied} despesa(s) categorizada(s) automaticamente pelas regras."
                : 'Nenhuma despesa correspondeu às regras existentes.'
        );
    }

    private function validateRule(Request $request): array
    {
        return $request->validate([
            'pattern'     => ['required', 'string', 'max:255'],
            'amount'      => ['nullable', 'numeric', 'min:0.01'],
            'category_id' => ['required', 'integer', 'exists:categories,id'],
            'ownership'   => ['required', 'in:payer1,payer2,both'],
        ]);
    }
}
