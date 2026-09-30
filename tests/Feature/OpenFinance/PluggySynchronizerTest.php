<?php

namespace Tests\Feature\OpenFinance;

use App\Models\Category;
use App\Models\Expense;
use App\Models\NameRule;
use App\Models\OpenFinanceAccount;
use App\Models\OpenFinanceInvestment;
use App\Models\OpenFinanceItem;
use App\Models\Setting;
use App\Services\OpenFinance\PluggySynchronizer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class PluggySynchronizerTest extends TestCase
{
    use RefreshDatabase;

    private const BASE = 'https://pluggy.test';

    private array $cardTransactions = [];
    private array $bankTransactions = [];

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'pluggy.base_url' => self::BASE,
            'pluggy.client_id' => 'id',
            'pluggy.client_secret' => 'secret',
            'groq.api_key' => null,
        ]);

        Setting::current()->update([
            'payer1_name' => 'Reni', 'payer2_name' => 'Lua', 'payer1_salary' => 6000, 'payer2_salary' => 4000,
            'card_closing_day' => 5,
        ]);

        $this->cardTransactions = [
            self::tx('t-purchase', 'DEBIT', 100.00, 'Mercado Central', '2026-09-06T03:00:00.000Z', ['creditCardMetadata' => ['billId' => 'bill-set']]),
            self::tx('t-refund', 'CREDIT', -20.00, 'Estorno de compra', '2026-09-08T03:00:00.000Z', ['creditCardMetadata' => ['billId' => 'bill-set']]),
            self::tx('t-payment', 'CREDIT', -3000.00, 'Pagamento recebido', '2026-09-07T03:00:00.000Z', ['category' => 'Credit card payment']),
            self::tx('t-usd', 'DEBIT', 21.49, 'Claude.ai', '2026-09-10T03:00:00.000Z', ['currencyCode' => 'USD', 'amountInAccountCurrency' => 114.40]),
            self::tx('t-inst-old-id', 'DEBIT', 50.00, 'Loja X 2/3', '2026-10-10T03:00:00.000Z', ['status' => 'PENDING', 'creditCardMetadata' => ['installmentNumber' => 2, 'totalInstallments' => 3]]),
        ];

        $this->bankTransactions = [
            self::tx('b-bill', 'DEBIT', -3000.00, 'Pagamento de fatura', '2026-09-07T12:00:00.000Z', ['category' => 'Transfers']),
            self::tx('b-salary', 'CREDIT', 5000.00, 'Transferência Recebida|EMPRESA', '2026-09-05T12:00:00.000Z', ['paymentData' => ['payer' => ['documentNumber' => ['value' => '12.345.678/0001-99']]]]),
            self::tx('b-lua', 'CREDIT', 900.00, 'Transferência Recebida|LUA', '2026-09-09T12:00:00.000Z', ['paymentData' => ['payer' => ['documentNumber' => ['value' => '555.666.777-88']]]]),
            self::tx('b-invest', 'DEBIT', -1000.00, 'Aplicação RDB', '2026-09-11T12:00:00.000Z', ['category' => 'Investments']),
            self::tx('b-rent', 'DEBIT', -1260.00, 'Transferência enviada|Locadora', '2026-09-10T12:00:00.000Z', ['paymentData' => ['receiver' => ['documentNumber' => ['value' => '999.888.777-66']]]]),
        ];

        Http::fake(function ($request) {
            $url = $request->url();

            return match (true) {
                str_contains($url, '/auth') => Http::response(['apiKey' => 'k']),
                str_contains($url, '/items/') => Http::response(['status' => 'UPDATED', 'connector' => ['name' => 'Banco Teste']]),
                str_contains($url, '/accounts') => Http::response(['results' => [
                    ['id' => 'acc-card', 'type' => 'CREDIT', 'subtype' => 'CREDIT_CARD', 'name' => 'Cartão', 'balance' => 194.40,
                        'creditData' => ['creditLimit' => 1000, 'availableCreditLimit' => 800, 'balanceDueDate' => '2026-10-14T00:00:00.000Z']],
                    ['id' => 'acc-bank', 'type' => 'BANK', 'subtype' => 'CHECKING_ACCOUNT', 'name' => 'Conta', 'balance' => 640.00],
                ]]),
                str_contains($url, '/v2/transactions') => Http::response([
                    'results' => str_contains($url, 'acc-card') ? $this->cardTransactions : $this->bankTransactions,
                    'next' => null,
                ]),
                str_contains($url, '/bills') => Http::response(['results' => [
                    ['id' => 'bill-set', 'dueDate' => '2026-09-14T00:00:00.000Z', 'billClosingDate' => '2026-09-07T00:00:00.000Z', 'totalAmount' => 80],
                ], 'totalPages' => 1]),
                str_contains($url, '/identity') => Http::response(['document' => '111.222.333-44']),
                str_contains($url, '/investments') => Http::response(['results' => [
                    ['id' => 'inv-1', 'type' => 'FIXED_INCOME', 'subtype' => 'CDB', 'name' => 'CDB', 'balance' => 1000, 'status' => 'ACTIVE'],
                ]]),
                default => Http::response([], 404),
            };
        });
    }

    private static function tx(string $id, string $type, float $amount, string $description, string $date, array $extra = []): array
    {
        return $extra + ['id' => $id, 'type' => $type, 'amount' => $amount, 'description' => $description, 'date' => $date, 'status' => 'POSTED'];
    }

    private function item(): OpenFinanceItem
    {
        return OpenFinanceItem::create(['item_id' => 'item-1', 'owner' => 'payer1', 'status' => 'UPDATING']);
    }

    public function test_first_sync_classifies_every_transaction(): void
    {
        $item = $this->item();

        $stats = app(PluggySynchronizer::class)->sync($item);

        $this->assertSame(10, $stats['created']);
        $kinds = Expense::pluck('kind', 'external_id');

        $this->assertSame('expense', $kinds['t-purchase']);
        $this->assertSame('expense', $kinds['t-refund']);
        $this->assertSame('ignored', $kinds['t-payment']);
        $this->assertSame('ignored', $kinds['b-bill']);
        $this->assertSame('income', $kinds['b-salary']);
        $this->assertSame('income', $kinds['b-lua']);
        $this->assertSame('ignored', $kinds['b-invest']);
        $this->assertSame('expense', $kinds['b-rent']);

        $this->assertSame(114.40, Expense::where('external_id', 't-usd')->value('amount'));
        // Compra de 06/09 numa fatura que fechou em 07/09 pertence ao ciclo de agosto.
        $this->assertSame('2026-08', Expense::where('external_id', 't-purchase')->value('competence'));
        $this->assertSame('2026-09', Expense::where('external_id', 'b-rent')->value('competence'));
        // Horário guardado no fuso do app; compra sem horário fica sem.
        $this->assertSame('2026-09-10 09:00', Expense::where('external_id', 'b-rent')->first()->occurred_at->format('Y-m-d H:i'));
        $this->assertNull(Expense::where('external_id', 't-purchase')->value('occurred_at'));

        $item->refresh();
        $this->assertSame('11122233344', $item->owner_document);
        $this->assertNotNull($item->last_synced_at);
        $this->assertSame(2, OpenFinanceAccount::count());
        $this->assertSame(1000.0, (float) OpenFinanceInvestment::sum('balance'));
    }

    public function test_sync_is_idempotent(): void
    {
        $item = $this->item();
        $synchronizer = app(PluggySynchronizer::class);

        $synchronizer->sync($item);
        $second = $synchronizer->sync($item->fresh());

        $this->assertSame([0, 0, 0], [$second['created'], $second['updated'], $second['removed']]);
        $this->assertSame(10, Expense::count());
    }

    public function test_replaced_pending_installment_is_removed_and_keeps_user_edits(): void
    {
        $item = $this->item();
        $synchronizer = app(PluggySynchronizer::class);
        $category = Category::create(['name' => 'Casa', 'color' => '#ffffff', 'default_ownership' => 'both']);

        $synchronizer->sync($item);

        Expense::where('external_id', 't-inst-old-id')->update([
            'category_id' => $category->id, 'ownership' => 'payer1', 'category_source' => 'user', 'notes' => 'presente',
        ]);

        // Fatura fechou: o Pluggy troca a parcela pendente por uma nova, com outro id.
        $this->cardTransactions[4] = self::tx('t-inst-new-id', 'DEBIT', 50.00, 'Loja X 2/3', '2026-10-10T03:00:00.000Z', [
            'creditCardMetadata' => ['installmentNumber' => 2, 'totalInstallments' => 3],
        ]);

        $stats = $synchronizer->sync($item->fresh());

        $this->assertSame(1, $stats['removed']);
        $this->assertNull(Expense::where('external_id', 't-inst-old-id')->first());

        $replacement = Expense::where('external_id', 't-inst-new-id')->first();
        $this->assertSame([$category->id, 'payer1', 'user', 'presente'], [
            $replacement->category_id, $replacement->ownership, $replacement->category_source, $replacement->notes,
        ]);
        $this->assertSame(10, Expense::count());
    }

    public function test_user_chosen_kind_survives_resync(): void
    {
        $item = $this->item();
        $synchronizer = app(PluggySynchronizer::class);
        $synchronizer->sync($item);

        // Usuário decide que o Pix de aluguel não deve contar (ex: foi reembolsado).
        Expense::where('external_id', 'b-rent')->update(['kind' => 'ignored', 'kind_reason' => 'user', 'kind_locked' => true]);

        $synchronizer->sync($item->fresh());

        $this->assertSame('ignored', Expense::where('external_id', 'b-rent')->value('kind'));
    }

    public function test_custom_name_applies_to_same_description_and_next_charges(): void
    {
        $this->cardTransactions[] = self::tx('t-cine-1', 'DEBIT', 30.00, 'INCENTIVE', '2026-09-12T03:00:00.000Z');
        $this->cardTransactions[] = self::tx('t-cine-2', 'DEBIT', 30.00, 'INCENTIVE', '2026-09-13T03:00:00.000Z');
        $item = $this->item();
        $synchronizer = app(PluggySynchronizer::class);
        $synchronizer->sync($item);

        Expense::where('external_id', 't-cine-1')->first()->rename('  Cinefy ');

        $this->assertSame(['t-cine-1' => 'Cinefy', 't-cine-2' => 'Cinefy'], Expense::where('description', 'INCENTIVE')->pluck('custom_name', 'external_id')->all());
        $this->assertNull(Expense::where('external_id', 't-purchase')->value('custom_name'));

        // Próxima cobrança chega já com o nome.
        $this->cardTransactions[] = self::tx('t-cine-3', 'DEBIT', 30.00, 'INCENTIVE', '2026-09-14T03:00:00.000Z');
        $synchronizer->sync($item->fresh());

        $this->assertSame('Cinefy', Expense::where('external_id', 't-cine-3')->value('custom_name'));

        // Tirar o nome volta todos para o nome do banco.
        Expense::where('external_id', 't-cine-2')->first()->rename('');

        $this->assertSame(0, Expense::whereNotNull('custom_name')->count());
        $this->assertSame(0, NameRule::count());
    }

    public function test_name_filter_with_wildcards(): void
    {
        $this->cardTransactions[] = self::tx('t-amz-3', 'DEBIT', 40.00, 'Amazon III', '2026-09-12T03:00:00.000Z');
        $this->cardTransactions[] = self::tx('t-amz-4', 'DEBIT', 45.00, 'AMAZON IV', '2026-09-13T03:00:00.000Z');
        $this->cardTransactions[] = self::tx('t-amz-mkt', 'DEBIT', 45.00, 'Pg *Amazon Marketplace', '2026-09-13T03:00:00.000Z');
        $item = $this->item();
        $synchronizer = app(PluggySynchronizer::class);
        $synchronizer->sync($item);

        Expense::where('external_id', 't-amz-3')->first()->rename('Amazon', 'Amazon %');

        $names = fn () => Expense::whereIn('external_id', ['t-amz-3', 't-amz-4', 't-amz-mkt'])->pluck('custom_name', 'external_id')->all();
        $this->assertSame(['t-amz-3' => 'Amazon', 't-amz-4' => 'Amazon', 't-amz-mkt' => null], $names());

        // Editar o filtro da mesma regra para "%Amazon%" pega também o que tem texto antes.
        Expense::where('external_id', 't-amz-4')->first()->rename('Amazon', '%Amazon%');
        $this->assertSame(['t-amz-3' => 'Amazon', 't-amz-4' => 'Amazon', 't-amz-mkt' => 'Amazon'], $names());
        $this->assertSame(1, NameRule::count());

        // Regra mais específica vence a genérica.
        Expense::where('external_id', 't-amz-mkt')->first()->rename('Amazon Marketplace', 'Pg *Amazon Marketplace');
        $this->assertSame(['t-amz-3' => 'Amazon', 't-amz-4' => 'Amazon', 't-amz-mkt' => 'Amazon Marketplace'], $names());

        // Nova cobrança que bate com o filtro chega com o nome.
        $this->cardTransactions[] = self::tx('t-amz-5', 'DEBIT', 12.00, 'Amazon V', '2026-09-14T03:00:00.000Z');
        $synchronizer->sync($item->fresh());
        $this->assertSame('Amazon', Expense::where('external_id', 't-amz-5')->value('custom_name'));
    }

    public function test_name_pattern_matches_the_displayed_name_and_escapes(): void
    {
        $rule = new NameRule(['pattern' => 'Joã_ %']);
        $this->assertTrue($rule->matches('Transferência enviada|JOAO Silva'));
        $this->assertFalse($rule->matches('Transferência enviada|Maria'));

        $this->assertTrue((new NameRule(['pattern' => '100\% Suco']))->matches('100% suco'));
        $this->assertFalse((new NameRule(['pattern' => '100\% Suco']))->matches('1000 suco'));
    }
}
