<?php

namespace App\Jobs;

use App\Models\Category;
use App\Models\Expense;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use OpenAI\Laravel\Facades\OpenAI;

class CategorizeExpensesJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $timeout = 120;

    public function __construct(private readonly array $expenseIds) {}

    public function handle(): void
    {
        $expenses = Expense::whereIn('id', $this->expenseIds)
            ->where('status', 'pending')
            ->get();

        if ($expenses->isEmpty()) {
            return;
        }

        // Carrega categorias disponíveis para incluir no prompt.
        $categoryNames = Category::pluck('name')->implode(', ');

        // Monta o array de descrições para enviar à IA em lote (reduz custo de tokens).
        $items = $expenses->map(fn ($e) => ['id' => $e->id, 'desc' => $e->description])->values();

        $prompt = <<<PROMPT
Você é um classificador financeiro. Analise as descrições de transações abaixo e classifique cada uma em uma das categorias disponíveis.

Categorias disponíveis: {$categoryNames}

Responda SOMENTE com um objeto JSON válido no formato:
{"results": [{"id": <id_da_transacao>, "category": "<nome_exato_da_categoria>"}]}

Transações:
{$items->toJson(JSON_UNESCAPED_UNICODE)}
PROMPT;

        try {
            $response = OpenAI::chat()->create([
                'model'       => 'gpt-4o-mini',
                'temperature' => 0,
                'messages'    => [
                    ['role' => 'system', 'content' => 'Você retorna apenas JSON válido, sem markdown, sem explicações.'],
                    ['role' => 'user',   'content' => $prompt],
                ],
            ]);

            $content = $response->choices[0]->message->content;
            $data    = json_decode($content, true);

            if (!isset($data['results'])) {
                throw new \RuntimeException("Resposta da IA sem chave 'results': {$content}");
            }

            // Cache de categorias para evitar N+1 em cada iteração.
            $categoryMap = Category::pluck('id', 'name');

            foreach ($data['results'] as $result) {
                $categoryId = $categoryMap[$result['category']]
                    ?? $categoryMap['Outros']
                    ?? null;

                Expense::where('id', $result['id'])->update([
                    'category_id' => $categoryId,
                    'status'      => 'categorized',
                ]);
            }
        } catch (\Throwable $e) {
            Log::error('CategorizeExpensesJob falhou', [
                'expense_ids' => $this->expenseIds,
                'error'       => $e->getMessage(),
            ]);

            // Marca como categorizado mesmo assim para não ficar em pending eterno;
            // a categoria ficará null e o usuário pode corrigir manualmente.
            Expense::whereIn('id', $this->expenseIds)->update(['status' => 'categorized']);

            throw $e;
        }
    }
}
