<?php

namespace App\Http\Controllers;

use App\Models\CategorizationRule;
use App\Models\Expense;
use App\Services\OpenFinance\ExpenseReclassifier;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CategorizationRuleController extends Controller
{
    // As regras são editadas na tela de Configurações.
    public function index(): RedirectResponse
    {
        return redirect()->route('settings.show');
    }

    public function store(Request $request, ExpenseReclassifier $reclassifier): RedirectResponse
    {
        $rule = CategorizationRule::create($this->validateRule($request));

        if ($rule->action === CategorizationRule::ACTION_IGNORE) {
            $reclassifier->run();
        }

        return back()->with('success', 'Regra criada.');
    }

    public function update(Request $request, CategorizationRule $categorizationRule, ExpenseReclassifier $reclassifier): RedirectResponse
    {
        $wasIgnore = $categorizationRule->action === CategorizationRule::ACTION_IGNORE;
        $categorizationRule->update($this->validateRule($request));

        if ($wasIgnore || $categorizationRule->action === CategorizationRule::ACTION_IGNORE) {
            $reclassifier->run();
        }

        return back()->with('success', 'Regra atualizada.');
    }

    public function destroy(CategorizationRule $categorizationRule, ExpenseReclassifier $reclassifier): RedirectResponse
    {
        $wasIgnore = $categorizationRule->action === CategorizationRule::ACTION_IGNORE;
        $categorizationRule->delete();

        // Lançamentos que só estavam fora dos cálculos por causa dessa regra voltam a contar.
        if ($wasIgnore) {
            $reclassifier->run();
        }

        return back()->with('success', 'Regra removida.');
    }

    /**
     * Reaplica as regras a todos os lançamentos: as de "ignorar" reclassificam; as de
     * categorizar sobrescrevem categoria e quem paga das despesas que baterem.
     */
    public function apply(ExpenseReclassifier $reclassifier): RedirectResponse
    {
        $reclassifier->run();

        $rules = CategorizationRule::where('action', CategorizationRule::ACTION_CATEGORIZE)->get();
        $applied = 0;

        Expense::where('kind', Expense::KIND_EXPENSE)->chunkById(500, function ($expenses) use ($rules, &$applied) {
            foreach ($expenses as $expense) {
                $rule = CategorizationRule::matchForExpense($expense, $rules);

                if (! $rule) {
                    continue;
                }

                $expense->update([
                    'category_id' => $rule->category_id,
                    'ownership' => $rule->ownership,
                    'category_source' => 'rule',
                    'status' => 'categorized',
                ]);
                $applied++;
            }
        });

        return back()->with(
            'success',
            $applied > 0
                ? "{$applied} lançamento(s) categorizado(s) pelas regras."
                : 'Nenhum lançamento correspondeu às regras de categoria.'
        );
    }

    private function validateRule(Request $request): array
    {
        $data = $request->validate([
            'pattern'     => ['required', 'string', 'max:255'],
            'action'      => ['required', Rule::in([CategorizationRule::ACTION_CATEGORIZE, CategorizationRule::ACTION_IGNORE])],
            'amount'      => ['nullable', 'numeric', 'min:0.01'],
            'category_id' => ['nullable', 'required_if:action,categorize', 'integer', 'exists:categories,id'],
            'ownership'   => ['required', 'in:payer1,payer2,both'],
        ]);

        if ($data['action'] === CategorizationRule::ACTION_IGNORE) {
            $data['category_id'] = null;
        }

        return $data;
    }
}
