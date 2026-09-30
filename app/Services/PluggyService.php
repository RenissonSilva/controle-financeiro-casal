<?php

namespace App\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\RequestException;
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

        return $this->request()
            ->post("{$this->baseUrl}/connect_token", $payload)
            ->throw()
            ->json('accessToken');
    }

    public function getItem(string $itemId): array
    {
        return $this->request()->get("{$this->baseUrl}/items/{$itemId}")->throw()->json();
    }

    public function deleteItem(string $itemId): void
    {
        $this->request()->delete("{$this->baseUrl}/items/{$itemId}")->throw();
    }

    public function getAccounts(string $itemId): array
    {
        return $this->request()
            ->get("{$this->baseUrl}/accounts", ['itemId' => $itemId])
            ->throw()
            ->json('results') ?? [];
    }

    public function getInvestments(string $itemId): array
    {
        return $this->request()
            ->get("{$this->baseUrl}/investments", ['itemId' => $itemId, 'pageSize' => 500])
            ->throw()
            ->json('results') ?? [];
    }

    // Faturas de um cartão (vencimento, fechamento, total). Cada compra aponta para a sua via billId.
    public function getBills(string $accountId): array
    {
        $bills = [];
        $page = 1;

        do {
            $response = $this->request()
                ->get("{$this->baseUrl}/bills", ['accountId' => $accountId, 'page' => $page])
                ->throw()
                ->json();

            $bills = [...$bills, ...($response['results'] ?? [])];
            $page++;
        } while ($page <= ($response['totalPages'] ?? 1));

        return $bills;
    }

    // Dados cadastrais do titular (CPF), usados para reconhecer transferências para si mesmo.
    public function getIdentity(string $itemId): ?array
    {
        $response = $this->request()->get("{$this->baseUrl}/identity", ['itemId' => $itemId]);

        return $response->successful() ? $response->json() : null;
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
            $request = $this->request();

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

    // Repete só falhas transitórias (rede, 5xx, 429); erro de requisição (4xx) sobe direto.
    private function request(): PendingRequest
    {
        return Http::withHeaders(['X-API-KEY' => $this->apiKey()])
            ->timeout(60)
            ->retry(2, 1000, fn (\Throwable $e) => $e instanceof ConnectionException
                || ($e instanceof RequestException && ($e->response->serverError() || $e->response->status() === 429)), throw: false);
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
