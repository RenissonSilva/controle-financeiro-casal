<?php

namespace App\Jobs;

use App\Models\Expense;
use App\Models\OpenFinanceItem;
use App\Services\PluggyService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Carbon;

class ImportPluggyTransactionsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $timeout = 300;

    public function __construct(private readonly int $openFinanceItemId) {}

    public function handle(PluggyService $pluggy): void
    {
        $item = OpenFinanceItem::find($this->openFinanceItemId);

        if (!$item) {
            return;
        }

        // Na primeira sincronização busca os últimos 3 meses; depois disso, só o que é novo.
        $from = $item->last_synced_at
            ? $item->last_synced_at->subDay()->toDateString()
            : now()->subMonths(3)->toDateString();

        $importedIds = [];

        foreach ($pluggy->getAccounts($item->item_id) as $account) {
            foreach ($pluggy->getTransactions($account['id'], $from) as $transaction) {
                // Só importa saídas (DEBIT). CREDIT = entrada de dinheiro ou pagamento de fatura — não é despesa.
                if ($transaction['type'] !== 'DEBIT') {
                    continue;
                }

                $expense = Expense::firstOrCreate(
                    ['import_hash' => 'pluggy_' . $transaction['id']],
                    [
                        'description' => (string) $transaction['description'],
                        'amount'      => abs((float) $transaction['amount']),
                        'date'        => Carbon::parse($transaction['date'])->toDateString(),
                        'source'      => $item->owner,
                        'ownership'   => 'both',
                        'status'      => 'pending',
                    ]
                );

                if ($expense->wasRecentlyCreated) {
                    $importedIds[] = $expense->id;
                }
            }
        }

        $item->update(['last_synced_at' => now(), 'status' => 'UPDATED']);

        if (!empty($importedIds)) {
            CategorizeExpensesJob::dispatch($importedIds);
        }
    }
}
