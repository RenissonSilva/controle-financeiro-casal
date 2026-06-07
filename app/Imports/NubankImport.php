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
 * O parâmetro $source ('payer1' ou 'payer2') identifica de qual cartão vieram as despesas.
 */
class NubankImport implements ToCollection, WithHeadingRow
{
    private array $importedIds   = [];
    private array $importedMonths = [];

    public function __construct(private readonly string $source = 'payer1') {}

    public function collection(Collection $rows): void
    {
        foreach ($rows as $row) {
            // Pagamentos de fatura geram valor negativo no extrato; ignoramos para não duplicar.
            if ((float) $row['amount'] <= 0) {
                continue;
            }

            // O source entra no hash para que Reni e Lua possam ter despesas idênticas
            // (mesma data/loja/valor) sem conflito de duplicata.
            $hash = md5($this->source . '|' . $row['date'] . '|' . $row['title'] . '|' . $row['amount']);

            $expense = Expense::firstOrCreate(
                ['import_hash' => $hash],
                [
                    'description' => (string) $row['title'],
                    'amount'      => (float) $row['amount'],
                    'date'        => Carbon::parse($row['date'])->toDateString(),
                    'source'      => $this->source,
                    'ownership'   => 'both',
                    'status'      => 'pending',
                ]
            );

            if ($expense->wasRecentlyCreated) {
                $this->importedIds[]    = $expense->id;
                $month = Carbon::parse($row['date'])->format('Y-m');
                $this->importedMonths[] = $month;
            }
        }

        if (!empty($this->importedIds)) {
            CategorizeExpensesJob::dispatch($this->importedIds);
        }
    }

    public function getImportedCount(): int
    {
        return count($this->importedIds);
    }

    /** Retorna o mês (Y-m) com mais despesas importadas, ou o mês atual. */
    public function getMostCommonMonth(): string
    {
        if (empty($this->importedMonths)) {
            return now()->format('Y-m');
        }

        $counts = array_count_values($this->importedMonths);
        arsort($counts);

        return array_key_first($counts);
    }
}
