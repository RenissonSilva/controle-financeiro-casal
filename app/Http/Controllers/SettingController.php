<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\CategorizationRule;
use App\Models\Expense;
use App\Models\OpenFinanceItem;
use App\Models\Setting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SettingController extends Controller
{
    public function show(): Response
    {
        $settings = Setting::current();

        return Inertia::render('Settings', [
            'settings' => [
                'payer1_name'                => $settings->payer1_name,
                'payer2_name'                => $settings->payer2_name,
                'payer1_salary'              => $settings->payer1_salary,
                'payer2_salary'              => $settings->payer2_salary,
                'payer1_percent'             => $settings->payer1_percent,
                'payer2_percent'             => $settings->payer2_percent,
                'card_closing_day'           => $settings->card_closing_day,
                'income_grace_days'          => $settings->income_grace_days,
            ],
            'categories' => Category::withCount('expenses')
                ->orderBy('name')
                ->get()
                ->map(fn (Category $category) => [
                    'id'                => $category->id,
                    'name'              => $category->name,
                    'color'             => $category->color,
                    'default_ownership' => $category->default_ownership,
                    'expenses_count'    => $category->expenses_count,
                ]),
            'rules' => CategorizationRule::with('category')
                ->orderBy('pattern')
                ->get()
                ->map(fn (CategorizationRule $rule) => [
                    'id'          => $rule->id,
                    'pattern'     => $rule->pattern,
                    'action'      => $rule->action,
                    'amount'      => $rule->amount,
                    'category_id' => $rule->category_id,
                    'category'    => $rule->category?->name,
                    'ownership'   => $rule->ownership,
                ]),
            'connections' => OpenFinanceItem::with('accounts')
                ->orderBy('connector_name')
                ->get()
                ->map(fn (OpenFinanceItem $item) => [
                    'id'              => $item->id,
                    'item_id'         => $item->item_id,
                    'connector_name'  => $item->connector_name,
                    'owner'           => $item->owner,
                    'status'          => $item->status,
                    'last_synced_at'  => $item->last_synced_at?->toIso8601String(),
                    'last_sync_error' => $item->last_sync_error,
                    'accounts'        => $item->accounts->map(fn ($account) => [
                        'id'      => $account->id,
                        'type'    => $account->type,
                        'name'    => $account->name,
                        'number'  => $account->number,
                        'balance' => $account->balance,
                    ]),
                ]),
            'useSandbox' => (bool) config('pluggy.use_sandbox'),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'payer1_name'                => ['required', 'string', 'max:100'],
            'payer2_name'                => ['required', 'string', 'max:100'],
            'payer1_salary'              => ['required', 'numeric', 'min:0'],
            'payer2_salary'              => ['required', 'numeric', 'min:0'],
            'card_closing_day'           => ['required', 'integer', 'min:1', 'max:28'],
            'income_grace_days'          => ['sometimes', 'integer', 'min:0', 'max:15'],
        ]);

        $settings = Setting::current();
        $settings->fill($data);

        $cycleChanged = $settings->isDirty(['card_closing_day', 'income_grace_days']);

        $settings->save();

        // Mudou o fechamento ou a tolerância da receita: todo lançamento pode mudar de mês.
        if ($cycleChanged) {
            Expense::recalculateCompetence();
        }

        return back()->with('success', 'Configurações salvas.');
    }
}
