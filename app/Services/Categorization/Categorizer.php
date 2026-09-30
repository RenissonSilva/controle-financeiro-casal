<?php

namespace App\Services\Categorization;

use App\Models\CategorizationRule;
use App\Models\Category;
use App\Models\Expense;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Categoriza despesas pendentes em três etapas, da mais barata para a mais cara:
 *
 * 1. Regras do usuário (trecho da descrição → categoria + quem paga).
 * 2. "Memória": repete a categoria/quem paga de um lançamento anterior do mesmo
 *    estabelecimento (mesmo CPF/CNPJ no Pix ou mesma descrição sem números).
 * 3. IA (Groq), só para o que sobrou — e uma vez por estabelecimento, não por lançamento.
 *
 * Categoria definida pelo usuário (category_source = 'user') nunca é sobrescrita.
 */
class Categorizer
{
    private const AI_CHUNK = 40;

    // Ordem de confiança ao reaproveitar a categoria de um lançamento anterior.
    private const TRUST = ['user' => 5, 'rule' => 4, 'fixed' => 4, 'memory' => 3, 'ai' => 2];

    /**
     * Regras + memória. Retorna os ids que continuam pendentes (vão para a IA).
     *
     * @param  iterable<int>  $ids
     * @return list<int>
     */
    public function applyLocal(iterable $ids): array
    {
        $expenses = Expense::whereIn('id', collect($ids))->where('status', 'pending')->get();

        if ($expenses->isEmpty()) {
            return [];
        }

        $rules = CategorizationRule::where('action', CategorizationRule::ACTION_CATEGORIZE)->get();
        $memory = $this->memory($expenses->pluck('id'));
        $remaining = [];

        foreach ($expenses as $expense) {
            if ($expense->kind !== Expense::KIND_EXPENSE || $expense->category_source === 'user') {
                $expense->update(['status' => 'categorized']);
                continue;
            }

            $rule = CategorizationRule::matchForExpense($expense, $rules);

            if ($rule) {
                $expense->update([
                    'category_id' => $rule->category_id,
                    'ownership' => $rule->ownership,
                    'category_source' => 'rule',
                    'status' => 'categorized',
                ]);
                continue;
            }

            $remembered = $memory->get(self::memoryKey($expense));

            if ($remembered) {
                $expense->update([
                    'category_id' => $remembered['category_id'],
                    'ownership' => $remembered['ownership'] ?? $expense->ownership,
                    'category_source' => 'memory',
                    'status' => 'categorized',
                ]);
                continue;
            }

            $remaining[] = $expense->id;
        }

        return $remaining;
    }

    /**
     * Categoriza por IA os ids informados. Falha de um lote não derruba os outros: o lote
     * que falhar fica sem categoria (status categorized) para não prender a tela em
     * "categorizando..." — o usuário pode pedir de novo pela tela de Lançamentos.
     *
     * @param  list<int>  $ids
     */
    public function applyAi(array $ids): void
    {
        $expenses = Expense::whereIn('id', $ids)->where('status', 'pending')->get();

        if ($expenses->isEmpty()) {
            return;
        }

        $categories = Category::all();

        if ($categories->isEmpty() || ! config('groq.api_key')) {
            Expense::whereIn('id', $expenses->pluck('id'))->update(['status' => 'categorized']);

            return;
        }

        // Um item por estabelecimento: "Uber" 44 vezes vira uma pergunta só.
        $groups = $expenses->groupBy(fn (Expense $e) => self::memoryKey($e));

        foreach ($groups->chunk(self::AI_CHUNK) as $chunk) {
            try {
                $answers = $this->askAi($chunk->values(), $categories);
            } catch (\Throwable $e) {
                Log::error('Categorização por IA falhou', ['error' => $e->getMessage()]);
                $answers = [];
            }

            foreach ($chunk->values() as $index => $group) {
                $category = $answers[$index] ?? null;

                Expense::whereIn('id', $group->pluck('id'))
                    ->where('status', 'pending')
                    ->update(array_filter([
                        'category_id' => $category?->id,
                        'ownership' => $category?->default_ownership,
                        'category_source' => $category ? 'ai' : null,
                        'status' => 'categorized',
                    ], fn ($value) => $value !== null));
            }
        }
    }

    /**
     * Chave do "mesmo estabelecimento": documento do Pix quando existe; senão a descrição
     * normalizada sem números nem sufixo de parcela ("Amazon 3/3" → "amazon").
     */
    public static function memoryKey(Expense $expense): string
    {
        if ($expense->counterparty_document) {
            return 'doc:'.$expense->counterparty_document;
        }

        $text = CategorizationRule::normalize($expense->description);
        $text = preg_replace('/\b\d+\s*\/\s*\d+\b/', ' ', $text);   // parcela 3/6
        $text = preg_replace('/\bparcela\b/', ' ', $text);
        $text = preg_replace('/\d+/', ' ', $text);
        $text = preg_replace('/[^a-z*|. ]+/', ' ', $text);

        return 'txt:'.trim(preg_replace('/\s+/', ' ', $text));
    }

    /**
     * Mapa chave → {category_id, ownership} a partir dos lançamentos já categorizados,
     * preferindo quem tem mais confiança (usuário > regra/fixa > memória > IA) e, no empate,
     * o mais recente. Quem paga só vem de lançamentos cujo dono não foi escolhido "só para
     * este" (null quando todos foram).
     *
     * @param  Collection<int, int>  $exceptIds
     */
    private function memory(Collection $exceptIds): Collection
    {
        return Expense::query()
            ->where('kind', Expense::KIND_EXPENSE)
            ->whereNotNull('category_id')
            ->whereNotIn('id', $exceptIds)
            ->orderBy('date')
            ->get(['id', 'description', 'counterparty_document', 'category_id', 'ownership', 'ownership_scope', 'category_source', 'date'])
            ->groupBy(fn (Expense $e) => self::memoryKey($e))
            ->map(function (Collection $rows) {
                $ranked = $rows->sortBy([
                    fn ($a, $b) => (self::TRUST[$b->category_source] ?? 1) <=> (self::TRUST[$a->category_source] ?? 1),
                    fn ($a, $b) => $b->date <=> $a->date,
                ]);

                return [
                    'category_id' => $ranked->first()->category_id,
                    'ownership' => $ranked->first(fn (Expense $e) => $e->ownership_scope !== 'one')?->ownership,
                ];
            });
    }

    /**
     * @param  Collection<int, Collection<int, Expense>>  $groups
     * @return array<int, Category|null> índice do grupo → categoria escolhida
     */
    private function askAi(Collection $groups, Collection $categories): array
    {
        $items = $groups->map(function (Collection $group, int $index) {
            $sample = $group->first();

            return array_filter([
                'id' => $index,
                'desc' => $sample->description,
                'nome_dado_pelo_casal' => $sample->custom_name,
                'dica_banco' => $sample->bank_category,
                'origem' => match ($sample->account_type) {
                    'CREDIT' => 'cartão de crédito',
                    'BANK' => 'conta corrente',
                    default => null,
                },
            ]);
        })->values();

        $categoryNames = $categories->pluck('name')->implode(', ');

        $prompt = <<<PROMPT
Você é um classificador financeiro de um casal brasileiro. Classifique cada transação abaixo em UMA das categorias disponíveis, usando o nome exato.
"dica_banco" é a categoria (em inglês) que o banco sugeriu — use como pista, não como resposta.
Quando nenhuma categoria servir, use "Outros" se existir.

Categorias disponíveis: {$categoryNames}

Responda SOMENTE com JSON válido no formato:
{"results": [{"id": <id>, "category": "<nome exato da categoria>"}]}

Transações:
{$items->toJson(JSON_UNESCAPED_UNICODE)}
PROMPT;

        $response = $this->postWithRetry(array_filter([
            'model' => config('groq.model'),
            'temperature' => 0,
            'reasoning_effort' => str_starts_with((string) config('groq.model'), 'openai/gpt-oss') ? config('groq.reasoning_effort') : null,
            'response_format' => ['type' => 'json_object'],
            'messages' => [
                ['role' => 'system', 'content' => 'Você retorna apenas JSON válido, sem markdown, sem explicações.'],
                ['role' => 'user', 'content' => $prompt],
            ],
        ], fn ($value) => $value !== null));

        $content = $response->json('choices.0.message.content');
        $data = json_decode((string) $content, true);

        if (! isset($data['results']) || ! is_array($data['results'])) {
            throw new \RuntimeException("Resposta da IA sem 'results': {$content}");
        }

        $byName = $categories->keyBy(fn (Category $c) => CategorizationRule::normalize($c->name));
        $fallback = $byName->get('outros');
        $answers = [];

        foreach ($data['results'] as $result) {
            if (! isset($result['id'])) {
                continue;
            }

            $answers[(int) $result['id']] = $byName->get(CategorizationRule::normalize($result['category'] ?? '')) ?? $fallback;
        }

        return $answers;
    }

    // O plano gratuito do Groq limita tokens por minuto: em 429, espera o tempo pedido e tenta de novo.
    private function postWithRetry(array $payload, int $attempts = 4): \Illuminate\Http\Client\Response
    {
        for ($attempt = 1; ; $attempt++) {
            $response = Http::withToken(config('groq.api_key'))
                ->timeout(90)
                ->post('https://api.groq.com/openai/v1/chat/completions', $payload);

            if ($response->status() !== 429 || $attempt >= $attempts) {
                return $response->throw();
            }

            $wait = (int) ceil((float) ($response->header('retry-after') ?: 10 * $attempt));
            sleep(min($wait, 60));
        }
    }
}
