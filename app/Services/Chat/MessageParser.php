<?php

namespace App\Services\Chat;

use App\Models\CategorizationRule;
use App\Models\Setting;
use Illuminate\Support\Carbon;

/**
 * Entende as mensagens do bot por regras (sem IA: resposta na hora, sem custo e testável).
 *
 *   "uber de ontem meu"        → mudar de quem é: pagador de quem mandou
 *   "drogasil de hoje dela"    → o outro pagador ("da Lua" / "do Reni" também valem)
 *   "ifood 45,90 sexta nosso"  → dos dois, filtrando pelo valor
 *   "2" / "1 e 3" / "todos"    → resposta à pergunta "qual delas?"
 *   "quanto a Lua deve?"       → acerto do mês
 *
 * Sem data = últimos 7 dias. O que sobra depois de tirar data, valor, dono e palavras de
 * ligação é o nome da cobrança.
 */
class MessageParser
{
    private const HELP = ['oi', 'ola', 'ajuda', 'help', 'menu', 'comandos', 'como funciona', 'bom dia', 'boa tarde', 'boa noite'];

    private const SELF = ['meu', 'minha', 'meus', 'minhas', 'mim'];

    private const OTHER = ['dela', 'dele', 'delas', 'deles'];

    private const BOTH = ['nosso', 'nossa', 'nossos', 'nossas', 'dividido', 'dividida', 'dividir', 'divide', 'metade', 'casal'];

    private const WEEKDAYS = ['domingo' => 0, 'segunda' => 1, 'terca' => 2, 'quarta' => 3, 'quinta' => 4, 'sexta' => 5, 'sabado' => 6];

    private const STOPWORDS = [
        'de', 'do', 'da', 'dos', 'das', 'e', 'o', 'a', 'os', 'as', 'um', 'uma', 'uns', 'umas', 'que', 'eu', 'foi', 'era', 'eh', 'ser',
        'pra', 'pro', 'pras', 'pros', 'para', 'com', 'no', 'na', 'nos', 'nas', 'em', 'por', 'esse', 'essa', 'esses', 'essas', 'este',
        'esta', 'isso', 'isto', 'aquele', 'aquela', 'ultimo', 'ultima', 'ultimos', 'ultimas', 'compra', 'compras', 'cobranca',
        'cobrancas', 'gasto', 'gastos', 'lancamento', 'lancamentos', 'despesa', 'despesas', 'pagamento', 'paguei', 'comprei',
        'peguei', 'pedi', 'gastei', 'fiz', 'feira', 'coloca', 'coloque', 'colocar', 'muda', 'mude', 'mudar', 'marca', 'marque',
        'marcar', 'passa', 'passar', 'deixa', 'deixar', 'ta', 'fica', 'ficar', 'agora', 'la', 'aqui', 'so', 'valor', 'reais',
        'real', 'vez', 'tambem', 'tb', 'ai', 'favor', 'pf', 'pfv', 'obrigado', 'obrigada', 'valeu', 'vlw', 'manha', 'tarde',
        'noite', 'cedo', 'todo', 'toda', 'todos', 'todas', 'cartao', 'pix', 'credito', 'debito', 'nao', 'sim', 'ne',
    ];

    /**
     * @return array{intent: 'help'|'settlement'}
     *       | array{intent: 'choice', choices: list<int>|'all'}
     *       | array{intent: 'ownership', owner: 'self'|'other'|'both'|'payer1'|'payer2', words: list<string>, from: Carbon, to: Carbon, amount: ?float}
     */
    public function parse(string $text): array
    {
        $text = CategorizationRule::normalize($text);
        $bare = trim($text, ' ?!.');

        if ($bare === '' || in_array($bare, self::HELP, true)) {
            return ['intent' => 'help'];
        }

        if ($choices = $this->choices($bare)) {
            return ['intent' => 'choice', 'choices' => $choices];
        }

        if (preg_match('/\bacerto\b/', $text) || (preg_match('/\bquanto\b/', $text) && preg_match('/\bdev/', $text))) {
            return ['intent' => 'settlement'];
        }

        [$from, $to, $text] = $this->period($text, Carbon::today());
        [$amount, $text] = $this->amount($text);
        [$owner, $words] = $this->ownerAndWords($text);

        if ($owner === null) {
            return ['intent' => 'help'];
        }

        return ['intent' => 'ownership', 'owner' => $owner, 'words' => $words, 'from' => $from, 'to' => $to, 'amount' => $amount];
    }

    /** @return list<int>|'all'|null */
    private function choices(string $text): array|string|null
    {
        if (preg_match('/^(todos|todas|tudo|os dois|as duas|ambos|ambas)$/', $text)) {
            return 'all';
        }

        if (preg_match('/^\d{1,2}(\s*(,|e)\s*\d{1,2})*$/', $text)) {
            preg_match_all('/\d+/', $text, $matches);

            return array_values(array_unique(array_map('intval', $matches[0])));
        }

        return null;
    }

    /**
     * Período da compra e o texto sem ele. Datas futuras sem ano voltam para o ano/mês anterior
     * ("25/12" dito em janeiro = dezembro passado).
     *
     * @return array{0: Carbon, 1: Carbon, 2: string}
     */
    private function period(string $text, Carbon $today): array
    {
        if (preg_match('/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2}|\d{4}))?\b/', $text, $m)) {
            $year = isset($m[3]) ? (int) (strlen($m[3]) === 2 ? "20{$m[3]}" : $m[3]) : $today->year;

            if (checkdate((int) $m[2], (int) $m[1], $year)) {
                $day = Carbon::create($year, (int) $m[2], (int) $m[1]);

                if (! isset($m[3]) && $day->gt($today)) {
                    $day->subYear();
                }

                return [$day, $day->copy(), $this->without($text, $m[0])];
            }
        }

        if (preg_match('/\bdia (\d{1,2})\b/', $text, $m) && $m[1] >= 1 && $m[1] <= 31) {
            $month = $today->copy()->startOfMonth();

            if ((int) $m[1] > $today->day) {
                $month->subMonth();
            }

            $day = $month->day(min((int) $m[1], $month->daysInMonth));

            return [$day, $day->copy(), $this->without($text, $m[0])];
        }

        foreach (['anteontem' => 2, 'ontem' => 1, 'hoje' => 0, 'hj' => 0] as $word => $daysAgo) {
            if (preg_match("/\\b{$word}\\b/", $text, $m)) {
                $day = $today->copy()->subDays($daysAgo);

                return [$day, $day->copy(), $this->without($text, $m[0])];
            }
        }

        // Dia da semana = o mais recente (hoje, se for o mesmo dia).
        foreach (self::WEEKDAYS as $word => $dayOfWeek) {
            if (preg_match("/\\b{$word}(?:[ -]feira)?\\b/", $text, $m)) {
                $day = $today->copy();

                while ($day->dayOfWeek !== $dayOfWeek) {
                    $day->subDay();
                }

                return [$day, $day->copy(), $this->without($text, $m[0])];
            }
        }

        return [$today->copy()->subDays(6), $today->copy(), $text];
    }

    /**
     * Valor em reais: "45,90", "45.90", "1.234,56", "r$ 50" ou "50 reais". Número sem centavos
     * e sem "r$/reais" é nome ("99", o app de corrida).
     *
     * @return array{0: ?float, 1: string}
     */
    private function amount(string $text): array
    {
        $patterns = [
            '/(?:r\$\s*)?\b(\d{1,3}(?:\.\d{3})+,\d{1,2}|\d+[.,]\d{1,2})\b/',
            '/r\$\s*(\d+)\b/',
            '/\b(\d+)\s*reais\b/',
        ];

        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $text, $m)) {
                $number = str_contains($m[1], ',') ? str_replace(['.', ','], ['', '.'], $m[1]) : $m[1];

                return [round((float) $number, 2), $this->without($text, $m[0])];
            }
        }

        return [null, $text];
    }

    /**
     * Dono pedido (a última palavra de dono vale: "o uber meu, não, dela" = dela) e as
     * palavras que sobram para achar a cobrança.
     *
     * @return array{0: ?string, 1: list<string>}
     */
    private function ownerAndWords(string $text): array
    {
        $text = preg_replace(['/\b(dos|nos|pros|pras|para os) dois\b/', '/\bda gente\b/', '/\bde nos\b/'], ' nosso ', $text);
        $tokens = preg_split('/[^a-z0-9]+/', $text, -1, PREG_SPLIT_NO_EMPTY);
        $names = $this->payerNames();
        $owner = null;
        $words = [];

        foreach ($tokens as $token) {
            $found = match (true) {
                in_array($token, self::SELF, true) => 'self',
                in_array($token, self::OTHER, true) => 'other',
                in_array($token, self::BOTH, true) => 'both',
                default => $names[$token] ?? null,
            };

            if ($found) {
                $owner = $found;
            } elseif (strlen($token) > 1 && ! in_array($token, self::STOPWORDS, true)) {
                $words[] = $token;
            }
        }

        return [$owner, array_values(array_unique($words))];
    }

    // Primeiro nome de cada um ("lua" → payer2). Nomes iguais (ex: "Pagador 1/2") não valem.
    private function payerNames(): array
    {
        $settings = Setting::current();
        $first = fn (string $name) => explode(' ', CategorizationRule::normalize($name))[0];
        [$payer1, $payer2] = [$first($settings->payer1_name), $first($settings->payer2_name)];

        return $payer1 !== $payer2 ? [$payer1 => 'payer1', $payer2 => 'payer2'] : [];
    }

    private function without(string $text, string $match): string
    {
        return trim(preg_replace('/\s+/', ' ', str_replace($match, ' ', $text)));
    }
}
