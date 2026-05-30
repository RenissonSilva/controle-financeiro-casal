<?php

namespace App\Imports;

use App\Jobs\CategorizeExpensesJob;
use App\Models\Expense;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;

/**
 * O CSV do Nubank tem o formato:
 *   date,category,title,amount
 *   2024-01-15,Restaurantes,IFOOD,45.90
 *
 * A coluna `category` é ignorada — a IA reclassifica por nós.
 */
class NubankImport implements ToCollection, WithHeadingRow
{
    private array $importedIds = [];

    public function collection(Collection $rows): void
    {
        foreach ($rows as $row) {
            // Pagamentos de fatura geram valor negativo no extrato; ignoramos para não duplicar.
            if ((float) $row['amount'] <= 0) {
                continue;
            }

            $hash = md5($row['date'] . '|' . $row['title'] . '|' . $row['amount']);

            $expense = Expense::firstOrCreate(
                ['import_hash' => $hash],
                [
                    'description' => (string) $row['title'],
                    'amount'      => (float) $row['amount'],
                    'date'        => Carbon::parse($row['date'])->toDateString(),
                    'ownership'   => 'both',
                    'status'      => 'pending',
                ]
            );

            if ($expense->wasRecentlyCreated) {
                $this->importedIds[] = $expense->id;
            }
        }

        // Dispara o job de categorização apenas para as despesas recém-criadas.
        if (!empty($this->importedIds)) {
            CategorizeExpensesJob::dispatch($this->importedIds);
        }
    }

    public function getImportedCount(): int
    {
        return count($this->importedIds);
    }
}
