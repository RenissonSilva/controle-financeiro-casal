<?php

namespace App\Http\Controllers;

use App\Jobs\ImportPluggyTransactionsJob;
use App\Models\OpenFinanceItem;
use App\Services\PluggyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class OpenFinanceController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('OpenFinance', [
            'items' => OpenFinanceItem::orderBy('connector_name')
                ->get()
                ->map(fn (OpenFinanceItem $item) => [
                    'id'              => $item->id,
                    'connector_name'  => $item->connector_name,
                    'owner'           => $item->owner,
                    'status'          => $item->status,
                    'last_synced_at'  => $item->last_synced_at?->format('d/m/Y H:i'),
                ]),
            'useSandbox' => (bool) config('pluggy.use_sandbox'),
        ]);
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

    public function store(Request $request, PluggyService $pluggy): RedirectResponse
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

        ImportPluggyTransactionsJob::dispatch($item->id);

        return back()->with('success', 'Conexão criada! Importando as transações em background.');
    }

    public function update(Request $request, OpenFinanceItem $openFinanceItem): RedirectResponse
    {
        $data = $request->validate([
            'owner' => ['required', 'in:payer1,payer2'],
        ]);

        $openFinanceItem->update($data);

        return back()->with('success', 'Conexão atualizada.');
    }

    public function sync(OpenFinanceItem $openFinanceItem): RedirectResponse
    {
        ImportPluggyTransactionsJob::dispatch($openFinanceItem->id);

        return back()->with('success', 'Sincronização iniciada em background.');
    }

    public function show(OpenFinanceItem $openFinanceItem, PluggyService $pluggy): Response
    {
        $accounts = collect($pluggy->getAccounts($openFinanceItem->item_id))
            ->map(function (array $account) use ($pluggy) {
                $transactions = collect($pluggy->getTransactions($account['id'], now()->subMonths(3)->toDateString()))
                    ->sortByDesc('date')
                    ->values()
                    ->map(fn (array $t) => [
                        'id'          => $t['id'],
                        'description' => $t['description'],
                        'amount'      => $t['amount'],
                        'date'        => $t['date'],
                        'type'        => $t['type'],
                        'category'    => $t['category'] ?? null,
                    ]);

                return [
                    'id'           => $account['id'],
                    'name'         => $account['name'] ?? null,
                    'type'         => $account['type'] ?? null,
                    'subtype'      => $account['subtype'] ?? null,
                    'number'       => $account['number'] ?? null,
                    'balance'      => $account['balance'] ?? null,
                    'currencyCode' => $account['currencyCode'] ?? null,
                    'transactions' => $transactions->all(),
                ];
            });

        return Inertia::render('OpenFinanceDetails', [
            'item' => [
                'id'             => $openFinanceItem->id,
                'connector_name' => $openFinanceItem->connector_name,
                'owner'          => $openFinanceItem->owner,
                'status'         => $openFinanceItem->status,
                'last_synced_at' => $openFinanceItem->last_synced_at?->format('d/m/Y H:i'),
            ],
            'accounts' => $accounts->values()->all(),
        ]);
    }

    public function destroy(OpenFinanceItem $openFinanceItem, PluggyService $pluggy): RedirectResponse
    {
        $pluggy->deleteItem($openFinanceItem->item_id);
        $openFinanceItem->delete();

        return back()->with('success', 'Conexão removida.');
    }
}
