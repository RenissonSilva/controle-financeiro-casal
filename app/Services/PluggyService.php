<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Client fino para a API do Pluggy (https://docs.pluggy.ai).
 * Guarda a apiKey (válida por ~2h) em cache pra não reautenticar a cada request.
 */
class PluggyService
{
    private string $baseUrl;

    public function __construct()
    {
        $this->baseUrl = rtrim(config('pluggy.base_url'), '/');
    }

    public function createConnectToken(?string $itemId = null): string
    {
        $payload = array_filter([
            'itemId' => $itemId,
            'options' => array_filter([
                'webhookUrl' => config('pluggy.webhook_url'),
            ]) ?: null,
        ]);

        $response = Http::withHeaders(['X-API-KEY' => $this->apiKey()])
            ->post("{$this->baseUrl}/connect_token", $payload)
            ->throw();

        return $response->json('accessToken');
    }

    public function getItem(string $itemId): array
    {
        return Http::withHeaders(['X-API-KEY' => $this->apiKey()])
            ->get("{$this->baseUrl}/items/{$itemId}")
            ->throw()
            ->json();
    }

    public function deleteItem(string $itemId): void
    {
        Http::withHeaders(['X-API-KEY' => $this->apiKey()])
            ->delete("{$this->baseUrl}/items/{$itemId}")
            ->throw();
    }

    public function getAccounts(string $itemId): array
    {
        return Http::withHeaders(['X-API-KEY' => $this->apiKey()])
            ->get("{$this->baseUrl}/accounts", ['itemId' => $itemId])
            ->throw()
            ->json('results') ?? [];
    }

    /**
     * Busca todas as transações de uma conta (com paginação por cursor), opcionalmente a partir de uma data.
     *
     * GET /transactions foi descontinuado pela Pluggy (HTTP 410) em favor de /v2/transactions.
     * O v2 não aceita `from`/`pageSize` (página fixa de 500) — o filtro de data é `createdAtFrom`
     * (quando o registro entrou na Pluggy, não a data da transação) e a paginação é por cursor:
     * cada resposta traz `next`, uma querystring pronta pra próxima página.
     */
    public function getTransactions(string $accountId, ?string $from = null): array
    {
        $transactions = [];
        $url = "{$this->baseUrl}/v2/transactions";
        $query = array_filter([
            'accountId'     => $accountId,
            'createdAtFrom' => $from,
        ]);

        while ($url) {
            $request = Http::withHeaders(['X-API-KEY' => $this->apiKey()]);

            // `$next` já vem com a querystring completa (incl. accountId) — passar um $query
            // vazio junto faz o client sobrescrever a query da URL e perder o accountId.
            $response = ($query ? $request->get($url, $query) : $request->get($url))
                ->throw()
                ->json();

            $transactions = [...$transactions, ...($response['results'] ?? [])];

            $next = $response['next'] ?? null;
            $url = $next ? "{$this->baseUrl}/v2/transactions{$next}" : null;
            $query = [];
        }

        return $transactions;
    }

    private function apiKey(): string
    {
        return Cache::remember('pluggy_api_key', now()->addMinutes(110), function () {
            $clientId = config('pluggy.client_id');
            $clientSecret = config('pluggy.client_secret');

            if (!$clientId || !$clientSecret) {
                throw new RuntimeException('PLUGGY_CLIENT_ID / PLUGGY_CLIENT_SECRET não configurados no .env.');
            }

            $response = Http::post("{$this->baseUrl}/auth", [
                'clientId'     => $clientId,
                'clientSecret' => $clientSecret,
            ])->throw();

            return $response->json('apiKey');
        });
    }
}
