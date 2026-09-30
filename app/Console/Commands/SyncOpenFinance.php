<?php

namespace App\Console\Commands;

use App\Models\CategorizationRule;
use App\Models\Expense;
use App\Models\OpenFinanceItem;
use App\Services\Categorization\Categorizer;
use App\Services\Finance\FixedExpenseMatcher;
use App\Services\OpenFinance\PluggySynchronizer;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

class SyncOpenFinance extends Command
{
    protected $signature = 'openfinance:sync
        {--item= : Id local da conexão (padrão: todas)}
        {--rebuild : Reconstrói o histórico: preserva edições, migra as linhas do CSV legado para as transações do Pluggy e apaga as duplicadas}
        {--dry-run : Com --rebuild, só mostra o que seria feito com as linhas do CSV}
        {--no-ai : Não chama a IA (fica tudo que sobrar como pendente de categoria)}';

    protected $description = 'Sincroniza as conexões Open Finance (Pluggy) com o banco local';

    public function handle(PluggySynchronizer $synchronizer, Categorizer $categorizer): int
    {
        $items = OpenFinanceItem::when($this->option('item'), fn ($q, $id) => $q->whereKey($id))->get();

        if ($items->isEmpty()) {
            $this->warn('Nenhuma conexão Open Finance cadastrada.');

            return self::SUCCESS;
        }

        $rebuild = (bool) $this->option('rebuild');
        $dryRun = $rebuild && $this->option('dry-run');

        if ($rebuild) {
            $this->prepareRebuild($items);
        }

        foreach ($items as $item) {
            $this->info("Sincronizando {$item->connector_name} (#{$item->id})...");
            $stats = $synchronizer->sync($item);
            $this->line("  {$stats['accounts']} contas · {$stats['created']} novas · {$stats['updated']} atualizadas · {$stats['removed']} removidas");
        }

        // O CSV só é comparado depois da sincronização, quando o histórico do Pluggy está completo.
        if ($dryRun) {
            $this->previewLegacyCsv();

            return self::SUCCESS;
        }

        if ($rebuild) {
            $this->migrateLegacyCsv();
            FixedExpenseMatcher::make()->matchBetween(Carbon::parse(Expense::min('date')), Carbon::parse(Expense::max('date')));
        }

        $pending = Expense::where('status', 'pending')->pluck('id');
        $remaining = $categorizer->applyLocal($pending);
        $this->line('Categorizadas por regra/memória: '.($pending->count() - count($remaining)));

        if ($remaining && ! $this->option('no-ai')) {
            $this->info('Categorizando '.count($remaining).' lançamentos com IA...');
            $categorizer->applyAi($remaining);
        }

        $this->line('Sem categoria: '.Expense::where('kind', Expense::KIND_EXPENSE)->whereNull('category_id')->count());

        return self::SUCCESS;
    }

    /**
     * Antes de reimportar: liga as linhas antigas do Pluggy à conexão (quando só existe uma)
     * e marca como "do usuário" tudo que já tinha categoria ou divisão escolhida, para a
     * reconstrução não mexer.
     */
    private function prepareRebuild(Collection $items): void
    {
        if (OpenFinanceItem::count() === 1) {
            Expense::where('origin', 'open_finance')->whereNull('open_finance_item_id')->update(['open_finance_item_id' => $items->first()->id]);
        }

        $preserved = Expense::whereNull('category_source')
            ->where(fn ($q) => $q->whereNotNull('category_id')->orWhere('ownership', '!=', 'both'))
            ->update(['category_source' => 'user']);

        // Tudo que é manual foi lançado pelo usuário.
        Expense::where('origin', 'manual')->whereNull('category_source')->update(['category_source' => 'user']);

        $this->line("Edições preservadas: {$preserved}");
    }

    /**
     * Linhas do CSV legado → transação equivalente do Pluggy (mesmo valor sem os centavos que
     * o import cortou, data até 4 dias de diferença, mesmo estabelecimento). A divisão
     * escolhida no CSV vai para a transação do Pluggy e a linha do CSV é apagada.
     */
    private function migrateLegacyCsv(): void
    {
        [$matches, $unmatched] = $this->matchLegacyCsv();

        foreach ($matches as [$csv, $pluggy]) {
            $update = [];

            if ($csv->ownership !== 'both') {
                $update['ownership'] = $csv->ownership;
            }

            if ($csv->category_id && ! $pluggy->category_id) {
                $update['category_id'] = $csv->category_id;
            }

            if ($update) {
                $pluggy->update([...$update, 'category_source' => 'user', 'status' => 'categorized']);
            }

            $csv->delete();
        }

        $this->line('CSV legado: '.count($matches).' linhas migradas para o Pluggy e apagadas; '.count($unmatched).' sem par (mantidas).');

        foreach ($unmatched as $csv) {
            $this->line("  sem par: {$csv->date->toDateString()} {$csv->description} R$ {$csv->amount}");
        }
    }

    private function previewLegacyCsv(): void
    {
        [$matches, $unmatched] = $this->matchLegacyCsv();

        $this->info(count($matches).' linhas do CSV têm par no Pluggy; '.count($unmatched).' não têm.');

        foreach (array_slice($matches, 0, 15) as [$csv, $pluggy]) {
            $this->line("  {$csv->date->toDateString()} {$csv->description} R$ {$csv->amount}  →  {$pluggy->date->toDateString()} {$pluggy->description} R$ {$pluggy->amount}");
        }

        foreach ($unmatched as $csv) {
            $this->line("  sem par: {$csv->date->toDateString()} {$csv->description} R$ {$csv->amount}");
        }
    }

    /** @return array{0: list<array{0: Expense, 1: Expense}>, 1: list<Expense>} */
    private function matchLegacyCsv(): array
    {
        $csvRows = Expense::where('origin', 'csv')->orderBy('date')->get();

        if ($csvRows->isEmpty()) {
            return [[], []];
        }

        $pool = Expense::where('origin', 'open_finance')
            ->where('direction', 'out')
            ->whereBetween('date', [$csvRows->min('date')->copy()->subDays(5)->toDateString(), $csvRows->max('date')->copy()->addDays(5)->toDateString()])
            ->get();

        $used = [];
        $matches = [];
        $unmatched = [];

        foreach ($csvRows as $csv) {
            $csvName = self::firstWord($csv->description);

            $pluggy = $pool
                ->reject(fn (Expense $p) => isset($used[$p->id]))
                // O import de CSV truncava os centavos (R$ 12,94 → 12): o par tem o mesmo valor inteiro.
                ->filter(fn (Expense $p) => (int) floor($p->amount + 0.0001) === (int) round($csv->amount))
                ->filter(fn (Expense $p) => $p->date->diffInDays($csv->date, true) <= 4)
                ->filter(fn (Expense $p) => self::firstWord($p->description) === $csvName || self::firstWord($p->displayName()) === $csvName)
                ->sortBy(fn (Expense $p) => [$p->date->diffInDays($csv->date, true), abs($p->amount - $csv->amount)])
                ->first();

            if ($pluggy) {
                $used[$pluggy->id] = true;
                $matches[] = [$csv, $pluggy];
            } else {
                $unmatched[] = $csv;
            }
        }

        return [$matches, $unmatched];
    }

    private static function firstWord(string $text): string
    {
        $normalized = CategorizationRule::normalize(preg_replace('/[^\pL\pN ]+/u', ' ', $text));

        return explode(' ', $normalized)[0] ?? '';
    }
}
