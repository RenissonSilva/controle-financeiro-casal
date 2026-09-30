<?php

namespace Tests\Feature\OpenFinance;

use App\Models\CategorizationRule;
use App\Models\Setting;
use App\Services\OpenFinance\TransactionClassifier;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TransactionClassifierTest extends TestCase
{
    use RefreshDatabase;

    private const OWNER = '11122233344';

    private function classify(array $transaction, string $accountType, iterable $rules = []): array
    {
        $classifier = new TransactionClassifier(self::OWNER);
        $bank = $classifier->bankAttributes($transaction + ['date' => '2026-09-10T15:00:00.000Z'], $accountType);

        return $bank + $classifier->classify($bank, $rules);
    }

    private static function pix(string $type, string $counterpartyDoc, array $extra = []): array
    {
        $side = $type === 'DEBIT' ? 'receiver' : 'payer';

        return $extra + [
            'type' => $type,
            'amount' => $type === 'DEBIT' ? -100 : 100,
            'paymentData' => [$side => ['documentNumber' => ['value' => $counterpartyDoc]]],
        ];
    }

    public function test_card_purchase_is_an_expense(): void
    {
        $row = $this->classify(['type' => 'DEBIT', 'amount' => 52.18, 'description' => 'Amazon'], 'CREDIT');

        $this->assertSame(['expense', 'out', 52.18], [$row['kind'], $row['direction'], $row['amount']]);
    }

    public function test_card_refund_reduces_expenses(): void
    {
        $row = $this->classify(['type' => 'CREDIT', 'amount' => -39.73, 'description' => 'Estorno de compra', 'category' => 'Shopping'], 'CREDIT');

        $this->assertSame(['expense', 'in', 'refund', 39.73], [$row['kind'], $row['direction'], $row['kind_reason'], $row['amount']]);
    }

    public function test_bill_payment_is_never_an_expense(): void
    {
        $onCard = $this->classify(['type' => 'CREDIT', 'amount' => -3506.02, 'description' => 'Pagamento recebido', 'category' => 'Credit card payment'], 'CREDIT');
        $reversal = $this->classify(['type' => 'CREDIT', 'amount' => -21.37, 'description' => 'Estorno de pagamento'], 'CREDIT');
        // Na conta o Pluggy classifica como "Transfers" — tem que ser reconhecido pela descrição.
        $onAccount = $this->classify(['type' => 'DEBIT', 'amount' => -3506.02, 'description' => 'Pagamento de fatura', 'category' => 'Transfers'], 'BANK');

        $this->assertSame(['ignored', 'card_payment'], [$onCard['kind'], $onCard['kind_reason']]);
        $this->assertSame(['ignored', 'card_payment'], [$reversal['kind'], $reversal['kind_reason']]);
        $this->assertSame(['ignored', 'bill_payment'], [$onAccount['kind'], $onAccount['kind_reason']]);
    }

    public function test_investment_moves_are_ignored(): void
    {
        $application = $this->classify(['type' => 'DEBIT', 'amount' => -500, 'description' => 'Aplicação RDB', 'category' => 'Investments'], 'BANK');
        $redemption = $this->classify(['type' => 'CREDIT', 'amount' => 500, 'description' => 'Resgate RDB'], 'BANK');

        $this->assertSame(['ignored', 'investment'], [$application['kind'], $application['kind_reason']]);
        $this->assertSame(['ignored', 'investment'], [$redemption['kind'], $redemption['kind_reason']]);
    }

    public function test_transfer_to_own_cpf_is_ignored(): void
    {
        $row = $this->classify(self::pix('DEBIT', '111.222.333-44', ['description' => 'Transferência enviada|FULANO', 'category' => 'Electronics']), 'BANK');

        $this->assertSame(['ignored', 'own_transfer', '11122233344'], [$row['kind'], $row['kind_reason'], $row['counterparty_document']]);
    }

    public function test_pix_is_never_settlement_automatically(): void
    {
        $received = $this->classify(self::pix('CREDIT', '555.666.777-88', ['description' => 'Transferência Recebida|PARCEIRA']), 'BANK');
        $sent = $this->classify(self::pix('DEBIT', '555.666.777-88', ['description' => 'Transferência enviada|Parceira']), 'BANK');

        $this->assertSame(['income', 'in'], [$received['kind'], $received['direction']]);
        $this->assertSame(['expense', 'out'], [$sent['kind'], $sent['direction']]);
        $this->assertSame('PARCEIRA', $received['counterparty_name']);
    }

    public function test_other_incoming_transfers_are_income_and_outgoing_are_expenses(): void
    {
        $salary = $this->classify(self::pix('CREDIT', '12345678000199', ['description' => 'Transferência Recebida|EMPRESA', 'amount' => 3861.03]), 'BANK');
        $rent = $this->classify(self::pix('DEBIT', '99988877766', ['description' => 'Transferência enviada|Locadora', 'amount' => -1260]), 'BANK');
        $debitRefund = $this->classify(['type' => 'CREDIT', 'amount' => 20, 'description' => 'Estorno - Compra no débito'], 'BANK');

        $this->assertSame(['income', 3861.03], [$salary['kind'], $salary['amount']]);
        $this->assertSame(['expense', 1260.0], [$rent['kind'], $rent['amount']]);
        $this->assertSame(['expense', 'in', 'refund'], [$debitRefund['kind'], $debitRefund['direction'], $debitRefund['kind_reason']]);
    }

    public function test_foreign_currency_uses_the_amount_charged_in_reais(): void
    {
        $row = $this->classify([
            'type' => 'DEBIT', 'amount' => 21.49, 'currencyCode' => 'USD', 'amountInAccountCurrency' => 114.4,
            'description' => 'Anthropic* Claude Sub',
        ], 'CREDIT');

        $this->assertSame([114.4, 21.49, 'USD'], [$row['amount'], $row['original_amount'], $row['currency_code']]);
    }

    public function test_installment_and_bill_metadata(): void
    {
        $classifier = new TransactionClassifier();
        $bills = TransactionClassifier::billDates([['id' => 'b1', 'dueDate' => '2026-09-14T00:00:00.000Z', 'billClosingDate' => '2026-09-05T00:00:00.000Z']]);

        $row = $classifier->bankAttributes([
            'type' => 'DEBIT', 'amount' => 77.4, 'description' => 'Manual Saude Brasil 4/6', 'date' => '2026-09-10T03:00:00.000Z',
            'status' => 'POSTED',
            'creditCardMetadata' => ['installmentNumber' => 4, 'totalInstallments' => 6, 'billId' => 'b1'],
        ], 'CREDIT', $bills);

        $this->assertSame([4, 6, '2026-09-14', '2026-09-05', 'POSTED'], [
            $row['installment_number'], $row['installment_total'], $row['bill_due_date'], $row['bill_closing_date'], $row['bank_status'],
        ]);
    }

    public function test_utc_dates_become_local_dates(): void
    {
        $classifier = new TransactionClassifier();

        // 02:05 UTC do dia 8 = 23:05 do dia 7 em São Paulo.
        $row = $classifier->bankAttributes(['type' => 'DEBIT', 'amount' => 10, 'description' => 'x', 'date' => '2026-09-08T02:05:02.828Z'], 'BANK');

        $this->assertSame('2026-09-07', $row['date']);
        $this->assertSame('2026-09-07 23:05:02', $row['occurred_at']);
    }

    private static function card(string $date, array $metadata = [], array $extra = []): array
    {
        return $extra + ['type' => 'DEBIT', 'amount' => 10, 'description' => 'Loja', 'date' => $date, 'creditCardMetadata' => $metadata];
    }

    public function test_card_purchase_at_the_terminal_shows_on_the_bill_day(): void
    {
        $classifier = new TransactionClassifier();

        // Autorizada 23/09 11:41 (.001Z = hora da maquininha); o Nubank lança na fatura no dia 24.
        $posted = $classifier->bankAttributes(self::card('2026-09-23T14:41:35.001Z', ['billPostDate' => '2026-09-24']), 'CREDIT');
        // Sem billPostDate: dia seguinte ao da compra (19/09 22:17 em São Paulo → 20/09).
        $guessed = $classifier->bankAttributes(self::card('2026-09-20T01:17:12.001Z'), 'CREDIT');
        // Compra pelo app (NuPay, horário com milissegundos reais) entra no mesmo dia.
        $nupay = $classifier->bankAttributes(self::card('2026-09-19T02:18:14.657Z'), 'CREDIT');

        $this->assertSame(['2026-09-24', '2026-09-23 11:41:35'], [$posted['date'], $posted['occurred_at']]);
        $this->assertSame(['2026-09-20', '2026-09-19 22:17:12'], [$guessed['date'], $guessed['occurred_at']]);
        $this->assertSame(['2026-09-18', '2026-09-18 23:18:14'], [$nupay['date'], $nupay['occurred_at']]);
    }

    public function test_dates_without_time_keep_their_calendar_day(): void
    {
        $classifier = new TransactionClassifier();

        $midnight = $classifier->bankAttributes(self::card('2026-09-21T03:00:00.000Z'), 'CREDIT');
        $refundNoon = $classifier->bankAttributes(self::card('2026-09-15T12:00:00.001Z', [], ['type' => 'CREDIT', 'amount' => -39.73]), 'CREDIT');
        // Meia-noite UTC seria 21h do dia anterior em São Paulo — é só um marcador de data.
        $refundMidnight = $classifier->bankAttributes(self::card('2026-03-20T00:00:00.001Z', [], ['type' => 'CREDIT', 'amount' => -86.56]), 'CREDIT');

        $this->assertSame(['2026-09-21', null], [$midnight['date'], $midnight['occurred_at']]);
        $this->assertSame(['2026-09-15', null], [$refundNoon['date'], $refundNoon['occurred_at']]);
        $this->assertSame(['2026-03-20', null], [$refundMidnight['date'], $refundMidnight['occurred_at']]);
    }

    public function test_future_installment_shows_on_the_first_day_of_its_bill_cycle(): void
    {
        Setting::current()->update(['card_closing_day' => 5]);
        $classifier = new TransactionClassifier();

        // Fatura que vence em outubro = ciclo de 05/09 a 04/10; o Pluggy projeta no dia 18.
        $next = $classifier->bankAttributes(self::card('2026-09-18T03:00:00.000Z', [
            'installmentNumber' => 2, 'totalInstallments' => 4, 'billForecastDate' => '2026-10',
        ], ['status' => 'PENDING']), 'CREDIT');
        $later = $classifier->bankAttributes(self::card('2026-11-18T03:00:00.000Z', [
            'installmentNumber' => 4, 'totalInstallments' => 4, 'billForecastDate' => '2026-12',
        ], ['status' => 'PENDING']), 'CREDIT');

        $this->assertSame('2026-09-05', $next['date']);
        $this->assertSame('2026-11-05', $later['date']);
    }

    public function test_user_ignore_rule_wins(): void
    {
        $rules = collect([new CategorizationRule(['pattern' => 'renisson silva', 'action' => 'ignore', 'ownership' => 'both'])]);

        $ownOtherBank = $this->classify(self::pix('DEBIT', '00011122233', ['description' => 'Transferência enviada|RENISSON SILVA']), 'BANK', $rules);
        $normal = $this->classify(self::pix('DEBIT', '00011122233', ['description' => 'Transferência enviada|Outra Pessoa']), 'BANK', $rules);

        $this->assertSame(['ignored', 'rule'], [$ownOtherBank['kind'], $ownOtherBank['kind_reason']]);
        $this->assertSame('expense', $normal['kind']);
    }
}
