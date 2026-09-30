<?php

namespace App\Services\OpenFinance;

use App\Models\CategorizationRule;
use App\Models\Expense;
use App\Models\Setting;
use Illuminate\Support\Carbon;

/**
 * Converte uma transação crua do Pluggy nos campos de um Expense e decide como ela entra
 * nos cálculos. É aqui que moram as regras que evitam contar dinheiro duas vezes:
 *
 * - Cartão: compra (DEBIT) é despesa; estorno (CREDIT) é despesa com sinal invertido;
 *   "Pagamento recebido" (CREDIT) é só a fatura sendo quitada → ignorado.
 * - Conta: "Pagamento de fatura" é ignorado (as compras do cartão já contam);
 *   aplicação/resgate é dinheiro mudando de lugar → ignorado; transferência para o próprio
 *   CPF → ignorada; o resto é despesa ou receita. Acerto do casal só é marcado à mão.
 * - Moeda estrangeira: vale o valor convertido na moeda da conta (amountInAccountCurrency).
 */
class TransactionClassifier
{
    private const INVESTMENT_KEYWORDS = ['aplicacao', 'resgate', 'rdb', 'caixinha', 'tesouro direto', 'cdb'];
    private const REFUND_KEYWORDS = ['estorno', 'reembolso', 'devolucao', 'cashback'];

    /** @param  string|null  $ownerDocument  CPF/CNPJ do titular da conta (só dígitos) */
    public function __construct(private readonly ?string $ownerDocument = null) {}

    /**
     * Campos vindos do banco — sempre atualizados a cada sincronização.
     *
     * @param  array<string, array{due: ?string, closing: ?string}>  $bills  faturas do cartão por id
     */
    public function bankAttributes(array $transaction, string $accountType, array $bills = []): array
    {
        $bill = $bills[$transaction['creditCardMetadata']['billId'] ?? ''] ?? null;

        $direction = ($transaction['type'] ?? 'DEBIT') === 'CREDIT' ? 'in' : 'out';
        $currency = strtoupper($transaction['currencyCode'] ?? 'BRL');
        $amount = $transaction['amountInAccountCurrency'] ?? null;

        // amountInAccountCurrency só vem preenchido quando a moeda difere da conta.
        if ($amount === null || $currency === 'BRL') {
            $amount = $transaction['amount'] ?? 0;
        }

        $counterparty = $this->counterparty($transaction, $direction);
        $metadata = $transaction['creditCardMetadata'] ?? [];
        $occurredAt = self::occurredAt($transaction['date']);

        return [
            'description' => mb_substr(trim((string) ($transaction['description'] ?? '')), 0, 255) ?: 'Sem descrição',
            'amount' => round(abs((float) $amount), 2),
            'direction' => $direction,
            'date' => self::bankDate($transaction, $accountType, $occurredAt),
            'occurred_at' => $occurredAt?->toDateTimeString(),
            'bank_status' => $transaction['status'] ?? null,
            'bank_category' => $transaction['category'] ?? null,
            'counterparty_name' => $counterparty['name'],
            'counterparty_document' => $counterparty['document'],
            'currency_code' => $currency,
            'original_amount' => $currency !== 'BRL' ? round(abs((float) ($transaction['amount'] ?? 0)), 2) : null,
            'installment_number' => $metadata['installmentNumber'] ?? null,
            'installment_total' => $metadata['totalInstallments'] ?? null,
            'bill_due_date' => $bill['due'] ?? null,
            'bill_closing_date' => $bill['closing'] ?? null,
            'account_type' => $accountType,
        ];
    }

    /**
     * Horário real da transação, no fuso do app — ou null quando o Pluggy só sabe o dia. Sem
     * horário ele manda meia-noite de Brasília (T03:00:00.000Z) ou, nos estornos do cartão,
     * um marcador UTC com 1 ms (T00:00:00.001Z / T12:00:00.001Z).
     */
    private static function occurredAt(string $raw): ?Carbon
    {
        if (self::isUtcDateMarker($raw)) {
            return null;
        }

        $moment = Carbon::parse($raw)->setTimezone(config('app.timezone'));

        return $moment->format('H:i:s.v') === '00:00:00.000' ? null : $moment;
    }

    private static function isUtcDateMarker(string $raw): bool
    {
        return (bool) preg_match('/T(00|12):00:00\.001Z$/', $raw);
    }

    /**
     * Dia em que o lançamento aparece no banco. Na conta é o dia da transação. No cartão é o
     * dia em que ela entra na fatura — o que o app e o CSV do Nubank mostram —, que pode ser
     * depois do dia da compra:
     * - `billPostDate`, quando o Pluggy manda;
     * - parcela futura: entra no primeiro dia do ciclo da fatura prevista (`billForecastDate`),
     *   e não no dia do mês da compra, como o Pluggy projeta;
     * - compra na maquininha (horário terminado em .001Z, que é a hora da autorização): entra
     *   na fatura no dia seguinte. Conferido contra o billPostDate e as faturas do Nubank: ~90%
     *   no dia seguinte, o resto 2 dias depois.
     */
    private static function bankDate(array $transaction, string $accountType, ?Carbon $occurredAt): string
    {
        $raw = $transaction['date'];
        $day = self::isUtcDateMarker($raw)
            ? substr($raw, 0, 10)
            : Carbon::parse($raw)->setTimezone(config('app.timezone'))->toDateString();

        if ($accountType !== 'CREDIT') {
            return $day;
        }

        $metadata = $transaction['creditCardMetadata'] ?? [];

        if (! empty($metadata['billPostDate'])) {
            return substr($metadata['billPostDate'], 0, 10);
        }

        if (($metadata['installmentNumber'] ?? 1) > 1 && ! empty($metadata['billForecastDate']) && empty($metadata['billId'])) {
            return self::cycleStartForBill($metadata['billForecastDate']);
        }

        if ($occurredAt && str_ends_with($raw, '.001Z')) {
            return $occurredAt->copy()->addDay()->toDateString();
        }

        return $day;
    }

    /**
     * Primeiro dia do ciclo da fatura que vence no mês informado (Y-m). A fatura vence ~7 dias
     * depois de fechar: fecha no mesmo mês do vencimento, a não ser que o fechamento seja no
     * fim do mês.
     */
    private static function cycleStartForBill(string $dueMonth): string
    {
        $settings = Setting::current();
        $due = Carbon::createFromFormat('Y-m-d', substr($dueMonth, 0, 7).'-01')->startOfDay();
        $closingMonth = $settings->card_closing_day + 7 <= $due->daysInMonth ? $due : $due->copy()->subMonthNoOverflow();

        return $settings->billingCycleRange($closingMonth->copy()->subMonthNoOverflow()->format('Y-m'))[0]->toDateString();
    }

    /**
     * Mapa id → datas da fatura, a partir do /bills do Pluggy. As datas vêm como meia-noite UTC
     * de um dia de calendário, então só a parte da data importa.
     *
     * @return array<string, array{due: ?string, closing: ?string}>
     */
    public static function billDates(array $bills): array
    {
        $map = [];

        foreach ($bills as $bill) {
            $map[$bill['id']] = [
                'due' => isset($bill['dueDate']) ? substr($bill['dueDate'], 0, 10) : null,
                'closing' => isset($bill['billClosingDate']) ? substr($bill['billClosingDate'], 0, 10) : null,
            ];
        }

        return $map;
    }

    /**
     * Decide o `kind` (expense/income/ignored) e o motivo, aplicando por último as regras do
     * usuário com ação "ignorar".
     *
     * @return array{kind: string, kind_reason: ?string}
     */
    public function classify(array $bank, iterable $rules = []): array
    {
        $rule = CategorizationRule::matchFor(
            $bank['description'],
            $bank['amount'],
            $bank['counterparty_name'],
            collect($rules)->where('action', CategorizationRule::ACTION_IGNORE)->values(),
        );

        if ($rule) {
            return ['kind' => Expense::KIND_IGNORED, 'kind_reason' => 'rule'];
        }

        return $this->automaticKind($bank);
    }

    /** @return array{kind: string, kind_reason: ?string} */
    private function automaticKind(array $bank): array
    {
        $description = CategorizationRule::normalize($bank['description']);
        $category = $bank['bank_category'];
        $isIn = $bank['direction'] === 'in';
        $document = $bank['counterparty_document'];

        if ($bank['account_type'] === 'CREDIT') {
            // Pagamento da fatura (e o estorno de um pagamento) é acerto com o banco, não compra.
            if ($isIn && ($category === 'Credit card payment' || $this->containsAny($description, ['pagamento recebido', 'estorno de pagamento']))) {
                return ['kind' => Expense::KIND_IGNORED, 'kind_reason' => 'card_payment'];
            }

            // Saldo de fatura anterior não paga reaparece como débito: as compras já contaram.
            if (! $isIn && $this->containsAny($description, ['saldo em atraso', 'saldo anterior', 'saldo devedor'])) {
                return ['kind' => Expense::KIND_IGNORED, 'kind_reason' => 'card_payment'];
            }

            return ['kind' => Expense::KIND_EXPENSE, 'kind_reason' => $isIn ? 'refund' : null];
        }

        if ($category === 'Credit card payment' || str_contains($description, 'pagamento de fatura')) {
            return ['kind' => Expense::KIND_IGNORED, 'kind_reason' => 'bill_payment'];
        }

        if ($category === 'Investments' || $this->containsAny($description, self::INVESTMENT_KEYWORDS)) {
            return ['kind' => Expense::KIND_IGNORED, 'kind_reason' => 'investment'];
        }

        if ($category === 'Same person transfer' || ($document && $document === $this->ownerDocument)) {
            return ['kind' => Expense::KIND_IGNORED, 'kind_reason' => 'own_transfer'];
        }

        if ($category === 'Transfer - Internal') {
            return ['kind' => Expense::KIND_IGNORED, 'kind_reason' => 'internal'];
        }

        if (! $isIn) {
            return ['kind' => Expense::KIND_EXPENSE, 'kind_reason' => null];
        }

        // Entrada na conta que devolve uma compra (estorno de débito) abate despesa, não é receita.
        if ($this->containsAny($description, self::REFUND_KEYWORDS)) {
            return ['kind' => Expense::KIND_EXPENSE, 'kind_reason' => 'refund'];
        }

        return ['kind' => Expense::KIND_INCOME, 'kind_reason' => null];
    }

    /**
     * Quem está do outro lado: quem recebeu (saída) ou quem pagou (entrada). O nome vem do
     * paymentData, do comerciante ou do trecho depois do "|" na descrição
     * ("Transferência enviada|Fulano de Tal").
     *
     * @return array{name: ?string, document: ?string}
     */
    private function counterparty(array $transaction, string $direction): array
    {
        $side = $transaction['paymentData'][$direction === 'out' ? 'receiver' : 'payer'] ?? [];
        $document = preg_replace('/\D/', '', (string) ($side['documentNumber']['value'] ?? '')) ?: null;

        $name = $side['name'] ?? null;
        $name ??= $transaction['merchant']['businessName'] ?? $transaction['merchant']['name'] ?? null;

        if (! $name && str_contains((string) ($transaction['description'] ?? ''), '|')) {
            $name = trim(explode('|', $transaction['description'], 2)[1]) ?: null;
        }

        return ['name' => $name ? mb_substr($name, 0, 255) : null, 'document' => $document];
    }

    private function containsAny(string $haystack, array $needles): bool
    {
        foreach ($needles as $needle) {
            if (preg_match('/\b'.preg_quote($needle, '/').'\b/', $haystack)) {
                return true;
            }
        }

        return false;
    }
}
