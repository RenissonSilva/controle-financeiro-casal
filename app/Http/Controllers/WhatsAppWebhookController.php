<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\Chat\ChatBot;
use App\Services\Chat\WhatsApp;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

/**
 * Webhook do bot do WhatsApp (Cloud API da Meta). Sem WHATSAPP_TOKEN a rota não existe; os
 * POSTs vêm assinados com o app secret. Só responde a números salvos no Perfil de uma conta
 * vinculada — o resto é ignorado em silêncio.
 */
class WhatsAppWebhookController extends Controller
{
    // A Meta confirma o endereço com um GET (hub.mode, hub.verify_token, hub.challenge).
    public function verify(Request $request): Response
    {
        abort_unless(WhatsApp::enabled(), 404);

        $token = (string) config('services.whatsapp.verify_token');

        abort_unless($request->query('hub_mode') === 'subscribe' && $token !== '' && hash_equals($token, (string) $request->query('hub_verify_token')), 403);

        return response((string) $request->query('hub_challenge'), 200, ['Content-Type' => 'text/plain']);
    }

    public function receive(Request $request, ChatBot $bot, WhatsApp $whatsApp): Response
    {
        abort_unless(WhatsApp::enabled(), 404);
        abort_unless(WhatsApp::validSignature($request->getContent(), $request->header('X-Hub-Signature-256')), 401);

        foreach ($request->input('entry', []) as $entry) {
            foreach ($entry['changes'] ?? [] as $change) {
                foreach ($change['value']['messages'] ?? [] as $message) {
                    $this->handle($message, $bot, $whatsApp);
                }
            }
        }

        // Sempre 200: qualquer outra resposta faz a Meta reenviar a mesma mensagem.
        return response('', 200);
    }

    private function handle(array $message, ChatBot $bot, WhatsApp $whatsApp): void
    {
        $from = (string) ($message['from'] ?? '');

        if (($message['type'] ?? null) !== 'text' || empty($message['id']) || $from === '') {
            return;
        }

        // A Meta reenvia quando a resposta demora: cada mensagem é tratada uma vez só.
        if (! Cache::add("whatsapp:message:{$message['id']}", true, now()->addDay())) {
            return;
        }

        $user = User::findByWhatsApp($from);

        if (! $user?->isLinked()) {
            Log::info('whatsapp: mensagem de número não cadastrado ignorada');

            return;
        }

        // O histórico de mudanças registra a edição em nome de quem mandou.
        Auth::setUser($user);

        try {
            $whatsApp->send($from, $bot->reply($user, (string) ($message['text']['body'] ?? ''), $from));
        } catch (\Throwable $e) {
            report($e);
            rescue(fn () => $whatsApp->send($from, 'Algo deu errado aqui. Tenta de novo daqui a pouco.'), report: false);
        }
    }
}
