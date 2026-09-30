<?php

namespace App\Http\Controllers;

use App\Models\Expense;
use App\Models\OpenFinanceItem;
use App\Services\Categorization\Categorizer;
use App\Services\OpenFinance\PluggySynchronizer;
use App\Services\PluggyService;
use App\Support\ExpensePresenter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class OpenFinanceController extends Controller
{
    // A tela de conexões virou a seção "Contas conectadas" de Configurações.
    public function index(): RedirectResponse
    {
        return redirect()->to(route('settings.show').'#contas');
    }

    public function connectToken(Request $request, PluggyService $pluggy): JsonResponse
    {
        $data = $request->validate([
            'item_id' => ['nullable', 'string'],
        ]);

        return response()->json([
            'accessToken' => $pluggy->createConnectToken($data['item_id'] ?? null),
        ]);
    }

    public function store(Request $request, PluggyService $pluggy, PluggySynchronizer $synchronizer, Categorizer $categorizer): RedirectResponse
    {
        $data = $request->validate([
            'item_id'        => ['required', 'string'],
            'connector_name' => ['nullable', 'string', 'max:255'],
            'owner'          => ['required', 'in:payer1,payer2'],
        ]);

        $item = OpenFinanceItem::updateOrCreate(
            ['item_id' => $data['item_id']],
            [
                'connector_name' => $data['connector_name'] ?? null,
                'owner'          => $data['owner'],
                'status'         => $pluggy->getItem($data['item_id'])['status'] ?? 'UPDATING',
            ]
        );

        $result = $this->syncItems(collect([$item]), $synchronizer, $categorizer);

        return back()->with(
            $result['errors'] ? 'error' : 'success',
            $result['errors'] ? 'Conexão criada, mas a primeira importação falhou: '.$result['errors'][0] : "Conexão criada! {$result['created']} transações importadas."
        );
    }

    public function update(Request $request, OpenFinanceItem $openFinanceItem): RedirectResponse
    {
        $data = $request->validate([
            'owner' => ['required', 'in:payer1,payer2'],
        ]);

        $openFinanceItem->update($data);
        // Os lançamentos da conexão passam a ser "pagos por" quem é o novo dono.
        $openFinanceItem->expenses()->update(['source' => $data['owner']]);

        return back()->with('success', 'Conexão atualizada.');
    }

    /**
     * Sincroniza uma conexão (ou todas, sem parâmetro) na hora: busca no Pluggy, classifica,
     * categoriza (regras, memória e IA) e vincula as contas fixas. Leva alguns segundos.
     */
    public function sync(Request $request, PluggySynchronizer $synchronizer, Categorizer $categorizer, ?OpenFinanceItem $openFinanceItem = null): JsonResponse|RedirectResponse
    {
        $items = $openFinanceItem ? collect([$openFinanceItem]) : OpenFinanceItem::all();
        $result = $this->syncItems($items, $synchronizer, $categorizer);

        if ($request->wantsJson()) {
            return response()->json($result, $result['errors'] ? 502 : 200);
        }

        return back()->with(
            $result['errors'] ? 'error' : 'success',
            $result['errors'] ? 'Falha ao sincronizar: '.$result['errors'][0] : self::summary($result)
        );
    }

    public function show(OpenFinanceItem $openFinanceItem): Response
    {
        $openFinanceItem->load('accounts', 'investments');

        return Inertia::render('OpenFinanceDetails', [
            'item' => [
                'id' => $openFinanceItem->id,
                'connector_name' => $openFinanceItem->connector_name,
                'owner' => $openFinanceItem->owner,
                'status' => $openFinanceItem->status,
                'last_synced_at' => $openFinanceItem->last_synced_at?->toIso8601String(),
                'last_sync_error' => $openFinanceItem->last_sync_error,
            ],
            'accounts' => $openFinanceItem->accounts->map(fn ($account) => [
                'id' => $account->id,
                'external_id' => $account->external_id,
                'type' => $account->type,
                'subtype' => $account->subtype,
                'name' => $account->name,
                'number' => $account->number,
                'balance' => $account->balance,
                'credit_limit' => $account->credit_limit,
                'available_credit_limit' => $account->available_credit_limit,
                'bill_due_date' => $account->bill_due_date?->toDateString(),
                'transactions' => Expense::with('category')
                    ->where('account_id', $account->external_id)
                    ->whereBetween('date', [now()->subMonths(3)->toDateString(), now()->toDateString()])
                    ->newestFirst()
                    ->get()
                    ->map(fn (Expense $e) => ExpensePresenter::row($e)),
                // Parcelas de faturas que ainda vão fechar, da mais próxima para a mais distante.
                'future' => Expense::with('category')
                    ->where('account_id', $account->external_id)
                    ->where('date', '>', now()->toDateString())
                    ->orderBy('date')
                    ->get()
                    ->map(fn (Expense $e) => ExpensePresenter::row($e)),
            ]),
            'investments' => $openFinanceItem->investments
                ->where('balance', '>', 0)
                ->sortByDesc('balance')
                ->values()
                ->map(fn ($investment) => [
                    'id' => $investment->id,
                    'name' => $investment->shortName(),
                    'type' => $investment->subtype ?? $investment->type,
                    'balance' => $investment->balance,
                ]),
        ]);
    }

    public function destroy(OpenFinanceItem $openFinanceItem, PluggyService $pluggy): RedirectResponse
    {
        try {
            $pluggy->deleteItem($openFinanceItem->item_id);
        } catch (\Throwable $e) {
            // A conexão pode já não existir no Pluggy; remove daqui de qualquer jeito.
            Log::warning('Falha ao remover item no Pluggy', ['item' => $openFinanceItem->id, 'error' => $e->getMessage()]);
        }

        $openFinanceItem->delete();

        return back()->with('success', 'Conexão removida. Os lançamentos já importados foram mantidos.');
    }

    /**
     * @return array{created: int, updated: int, removed: int, categorized_by_ai: int, errors: list<string>}
     */
    private function syncItems($items, PluggySynchronizer $synchronizer, Categorizer $categorizer): array
    {
        set_time_limit(300);

        $result = ['created' => 0, 'updated' => 0, 'removed' => 0, 'categorized_by_ai' => 0, 'errors' => []];

        // Evita duas sincronizações simultâneas (ex: Home aberta em duas abas).
        $lock = Cache::lock('open-finance:sync', 300);

        if (! $lock->get()) {
            $result['errors'][] = 'Já existe uma sincronização em andamento.';

            return $result;
        }

        try {
            foreach ($items as $item) {
                try {
                    $stats = $synchronizer->sync($item);
                    $result['created'] += $stats['created'];
                    $result['updated'] += $stats['updated'];
                    $result['removed'] += $stats['removed'];
                } catch (\Throwable $e) {
                    $message = Str::limit($e->getMessage(), 300);
                    $item->update(['last_sync_error' => $message]);
                    $result['errors'][] = $message;
                }
            }

            $pending = Expense::where('status', 'pending')->pluck('id')->all();

            if ($pending) {
                $categorizer->applyAi($categorizer->applyLocal($pending));
                $result['categorized_by_ai'] = count($pending);
            }
        } finally {
            $lock->release();
        }

        return $result;
    }

    private static function summary(array $result): string
    {
        if ($result['created'] === 0 && $result['removed'] === 0) {
            return 'Tudo em dia — nenhuma transação nova.';
        }

        return "Sincronizado: {$result['created']} novas, {$result['updated']} atualizadas, {$result['removed']} removidas.";
    }
}
