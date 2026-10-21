<?php

namespace App\Services\Chat;

use App\Models\Expense;
use App\Models\PendingOwnership;
use App\Models\Setting;
use App\Models\User;
use App\Services\Finance\CycleReport;
use App\Support\Activity;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;

/**
 * Cérebro do bot, sem depender do canal: recebe o texto de quem mandou e devolve a resposta.
 * "Meu" é sempre de quem mandou (ver User::payer()). A mudança vale só para aquela cobrança,
 * como o "Só este" do formulário.
 */
class ChatBot
{
    // Quanto tempo vale a pergunta "achei 2, qual?".
    private const CHOICES_MINUTES = 15;

    private const MAX_CHOICES = 5;

    private const EXAMPLE = 'Ex: uber de ontem meu';

    public function __construct(private MessageParser $parser, private ExpenseFinder $finder) {}

    public function reply(User $sender, string $text, ?string $chatId = null): string
    {
        $message = $this->parser->parse($text);

        return match ($message['intent']) {
            'settlement' => $this->settlement(),
            'choice' => $this->choose($sender, $message['choices']),
            'ownership' => $this->ownership($sender, $message, $chatId),
            default => $this->help(),
        };
    }

    // "Uber · R$ 23,50 · 20/10 às 19:02" — dia e hora da compra, que é o que a pessoa lembra. A
    // parcela entra porque o nome personalizado ("Amazon") esconde o "2/3" da descrição do banco.
    public static function describe(Expense $expense): string
    {
        $when = ($expense->occurred_at ?? $expense->date)->format('d/m');

        if ($expense->occurred_at && $expense->occurred_at->format('H:i') !== '00:00') {
            $when .= ' às '.$expense->occurred_at->format('H:i');
        }

        $parts = [$expense->custom_name ?: $expense->displayName(), Activity::format('money', $expense->amount), $when];

        if ($expense->installment_number && $expense->installment_total) {
            $parts[] = "parcela {$expense->installment_number}/{$expense->installment_total}";
        }

        return implode(' · ', $parts);
    }

    private function ownership(User $sender, array $message, ?string $chatId): string
    {
        if (! $sender->hasPermission('expenses.edit')) {
            return 'Sua conta não tem permissão para editar lançamentos. Peça para a conta principal liberar.';
        }

        if (! $message['words']) {
            return 'Qual cobrança? Mande o nome junto. '.self::EXAMPLE;
        }

        $ownership = $this->resolveOwner($sender, $message['owner']);
        $query = implode(' ', $message['words']);
        $expenses = $this->finder->find($message['words'], $message['from'], $message['to'], $message['amount']);
        $period = self::period($message['from'], $message['to']);

        if ($expenses->count() === 1) {
            return $this->apply($expenses->first(), $ownership);
        }

        if ($expenses->isEmpty()) {
            return $this->notFound($sender, $chatId, $message, $ownership, $query, $period);
        }

        $shown = $expenses->take(self::MAX_CHOICES)->values();
        Cache::put($this->choicesKey($sender), ['ids' => $shown->pluck('id')->all(), 'ownership' => $ownership], now()->addMinutes(self::CHOICES_MINUTES));

        $lines = $shown->map(fn (Expense $expense, int $i) => ($i + 1).') '.self::describe($expense));
        $header = "Achei {$expenses->count()} cobranças de \"{$query}\" {$period}"
            .($expenses->count() > self::MAX_CHOICES ? ' — estas são as '.self::MAX_CHOICES.' mais recentes (mande o valor para achar outra)' : '').':';

        return implode("\n", [$header, ...$lines, '', 'Qual delas fica como "'.Activity::format('payer', $ownership).'"? Responda 1, 2… ou todos.']);
    }

    /** @param  list<int>|'all'  $choices */
    private function choose(User $sender, array|string $choices): string
    {
        $state = Cache::get($this->choicesKey($sender));

        if (! $state) {
            return 'Não tenho nenhuma pergunta em aberto. '.self::EXAMPLE;
        }

        if (! $sender->hasPermission('expenses.edit')) {
            return 'Sua conta não tem permissão para editar lançamentos. Peça para a conta principal liberar.';
        }

        $ids = $choices === 'all' ? $state['ids'] : array_map(fn (int $n) => $state['ids'][$n - 1] ?? null, $choices);

        if (in_array(null, $ids, true)) {
            return 'Responda com um número de 1 a '.count($state['ids']).' ou "todos".';
        }

        Cache::forget($this->choicesKey($sender));
        $expenses = Expense::whereIn('id', $ids)->get();

        if ($expenses->isEmpty()) {
            return 'Essas cobranças mudaram na última sincronização. Mande o pedido de novo.';
        }

        return $expenses->map(fn (Expense $expense) => $this->apply($expense, $state['ownership']))->implode("\n\n");
    }

    // "✅ Uber · R$ 23,50 · 20/10 às 19:02 / De quem é: Nós → Lua", depois de aplicado.
    public static function applied(Expense $expense, string $before): string
    {
        $change = $before === $expense->ownership
            ? Activity::format('payer', $before).' (já estava assim)'
            : Activity::format('payer', $before).' → '.Activity::format('payer', $expense->ownership);

        return '✅ '.self::describe($expense)."\nDe quem é: {$change}";
    }

    private function apply(Expense $expense, string $ownership): string
    {
        $before = $expense->ownership;
        $expense->assignOwner($ownership);

        return self::applied($expense, $before);
    }

    // Compra recente que ainda não chegou do banco (o Pluggy leva 1–2 dias) vira pedido pendente.
    private function notFound(User $sender, ?string $chatId, array $message, string $ownership, string $query, string $period): string
    {
        if ($message['to']->lt(Carbon::today()->subDays(PendingOwnership::DAYS))) {
            return "Não achei nenhuma cobrança de \"{$query}\" {$period}. Confira o nome e a data. ".self::EXAMPLE;
        }

        $pending = PendingOwnership::updateOrCreate([
            'user_id' => $sender->id,
            'query' => $query,
            'amount' => $message['amount'],
            'from_date' => $message['from']->toDateString(),
            'to_date' => $message['to']->toDateString(),
            'applied_at' => null,
        ], [
            'chat_id' => $chatId,
            'ownership' => $ownership,
            'expires_at' => Carbon::today()->addDays(PendingOwnership::DAYS)->endOfDay(),
        ]);

        return "Ainda não chegou do banco nenhuma cobrança de \"{$query}\" {$period}. "
            .'Quando chegar, marco como "'.Activity::format('payer', $ownership).'"'
            .' (vale até '.$pending->expires_at->format('d/m').').';
    }

    private function settlement(): string
    {
        $settings = Setting::current();
        $report = CycleReport::for($settings->currentCycle(), $settings);
        $due = $report->settlementDue();

        if (abs($due) < 0.01) {
            return "Acerto de {$report->label()}: ninguém deve nada até agora.";
        }

        [$debtor, $creditor] = $due > 0 ? ['payer2', 'payer1'] : ['payer1', 'payer2'];

        return "Acerto de {$report->label()} (até agora): {$settings->payerName($debtor)} deve "
            .Activity::format('money', abs($due))." para {$settings->payerName($creditor)}.";
    }

    private function help(): string
    {
        $settings = Setting::current();

        return implode("\n", [
            'Oi! Pra mudar de quem é uma cobrança, mande o nome, quando foi e de quem é:',
            '• uber de ontem meu',
            '• drogasil de hoje dela',
            '• ifood 45,90 sexta nosso',
            '',
            "Também respondo \"quanto a {$settings->payer2_name} deve?\".",
        ]);
    }

    // "dela/dele" é sempre o outro, do ponto de vista de quem mandou.
    private function resolveOwner(User $sender, string $owner): string
    {
        return match ($owner) {
            'self' => $sender->payer(),
            'other' => $sender->payer() === 'payer1' ? 'payer2' : 'payer1',
            default => $owner,
        };
    }

    private static function period(Carbon $from, Carbon $to): string
    {
        return $from->isSameDay($to) ? 'em '.$from->format('d/m') : "de {$from->format('d/m')} a {$to->format('d/m')}";
    }

    private function choicesKey(User $sender): string
    {
        return "chat:{$sender->id}:choices";
    }
}
