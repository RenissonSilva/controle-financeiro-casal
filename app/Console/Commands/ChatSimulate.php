<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Services\Chat\ChatBot;
use Illuminate\Console\Command;

/**
 * Conversa com o bot do WhatsApp pelo terminal, sem passar pela Meta. As mudanças são de
 * verdade no banco configurado — para testar, aponte DB_DATABASE para uma cópia (_e2e).
 */
class ChatSimulate extends Command
{
    protected $signature = 'chat:simulate
        {email : Conta que "manda" a mensagem}
        {message : Texto da mensagem, ex: "uber de ontem meu"}';

    protected $description = 'Mostra o que o bot do WhatsApp responderia (aplica as mudanças no banco configurado)';

    public function handle(ChatBot $bot): int
    {
        $user = User::where('email', $this->argument('email'))->first();

        if (! $user?->isLinked()) {
            $this->error('Conta não encontrada ou ainda não vinculada.');

            return self::FAILURE;
        }

        $this->line($bot->reply($user, $this->argument('message')));

        return self::SUCCESS;
    }
}
