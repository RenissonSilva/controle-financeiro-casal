<?php

namespace App\Services\Chat;

use Illuminate\Support\Facades\Http;

/**
 * WhatsApp Cloud API (oficial da Meta). Mensagens recebidas não são cobradas; as respostas
 * dentro da janela de 24 h depois da mensagem da pessoa têm 1.000 grátis por mês. Sem
 * WHATSAPP_TOKEN o bot fica desligado (ver DEPLOY.md, "Bot do WhatsApp").
 */
class WhatsApp
{
    public static function enabled(): bool
    {
        return filled(config('services.whatsapp.token'));
    }

    public function send(string $to, string $text): void
    {
        $config = config('services.whatsapp');

        Http::withToken($config['token'])
            ->timeout(10)
            ->post("https://graph.facebook.com/{$config['graph_version']}/{$config['phone_number_id']}/messages", [
                'messaging_product' => 'whatsapp',
                'to' => $to,
                'type' => 'text',
                'text' => ['body' => $text],
            ])
            ->throw();
    }

    // A Meta assina o corpo de cada POST do webhook com o app secret (X-Hub-Signature-256).
    public static function validSignature(string $payload, ?string $header): bool
    {
        $secret = config('services.whatsapp.app_secret');

        return filled($secret) && filled($header) && hash_equals('sha256='.hash_hmac('sha256', $payload, $secret), $header);
    }

    /**
     * Número só com dígitos e DDI: "(71) 99999-8888" → "5571999998888". Sem DDI (10 ou 11
     * dígitos) assume Brasil.
     */
    public static function normalizeNumber(?string $number): ?string
    {
        $digits = preg_replace('/\D/', '', (string) $number);

        if ($digits === '') {
            return null;
        }

        return in_array(strlen($digits), [10, 11], true) ? "55{$digits}" : $digits;
    }

    /**
     * Formas do mesmo número para procurar a conta: o "from" da Meta às vezes vem sem o 9 do
     * celular brasileiro (5571 8888-7777 em vez de 5571 9 8888-7777), conforme o cadastro antigo.
     *
     * @return list<string>
     */
    public static function numberVariants(string $number): array
    {
        $digits = self::normalizeNumber($number);

        if ($digits === null) {
            return [];
        }

        if (str_starts_with($digits, '55') && strlen($digits) === 13 && $digits[4] === '9') {
            return [$digits, substr($digits, 0, 4).substr($digits, 5)];
        }

        // Celular de 8 dígitos começa com 6 a 9; fixo (2 a 5) não ganha o 9.
        if (str_starts_with($digits, '55') && strlen($digits) === 12 && $digits[4] >= '6') {
            return [$digits, substr($digits, 0, 4).'9'.substr($digits, 4)];
        }

        return [$digits];
    }
}
