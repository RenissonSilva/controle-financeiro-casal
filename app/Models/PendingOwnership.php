<?php

namespace App\Models;

use App\Services\Chat\ChatBot;
use App\Services\Chat\ExpenseFinder;
use App\Services\Chat\WhatsApp;
use App\Support\Activity;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Log;

/**
 * "De quem é" pedido pelo bot para uma compra que ainda não chegou do banco (o Pluggy leva
 * 1–2 dias): aplicado na primeira sincronização em que ela aparecer, a todas as cobranças
 * com aquele nome no período pedido. Vale por DAYS dias.
 */
class PendingOwnership extends Model
{
    public const DAYS = 5;

    protected $fillable = ['user_id', 'chat_id', 'query', 'amount', 'from_date', 'to_date', 'ownership', 'expires_at', 'applied_at'];

    protected $casts = [
        'amount' => 'float',
        'from_date' => 'date',
        'to_date' => 'date',
        'expires_at' => 'datetime',
        'applied_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Aplica os pedidos válidos às despesas que já chegaram e devolve quantas mudaram. Rodar
     * depois da categorização (senão regra/memória/IA trocariam o dono de volta) e fora de
     * Activity::withoutRecording(): o histórico registra quem pediu, não quem sincronizou.
     */
    public static function applyAll(): int
    {
        static::whereNull('applied_at')->where('expires_at', '<=', now())->delete();

        $finder = app(ExpenseFinder::class);
        $changed = 0;

        foreach (static::whereNull('applied_at')->with('user')->get() as $pending) {
            $expenses = $finder->find(explode(' ', $pending->query), $pending->from_date, $pending->to_date, $pending->amount);

            if ($expenses->isEmpty()) {
                continue;
            }

            $lines = [];

            foreach ($expenses as $expense) {
                $before = $expense->ownership;
                Activity::withoutRecording(fn () => $expense->assignOwner($pending->ownership));
                $changed++;

                if ($before !== $pending->ownership) {
                    Activity::record('expenses', 'updated', $expense->activityDescription('updated'), $expense->activityLabel(), $expense, [
                        Activity::change('ownership', 'De quem é', Activity::format('payer', $before), Activity::format('payer', $pending->ownership)),
                    ], $pending->user);
                }

                $lines[] = ChatBot::applied($expense, $before);
            }

            $pending->update(['applied_at' => now()]);
            $pending->notify("Chegou do banco:\n\n".implode("\n\n", $lines));
        }

        return $changed;
    }

    // Avisa no WhatsApp. Fora da janela de 24 h da Meta a mensagem é recusada — tudo bem, já foi aplicado.
    private function notify(string $text): void
    {
        if (! $this->chat_id || ! WhatsApp::enabled()) {
            return;
        }

        try {
            app(WhatsApp::class)->send($this->chat_id, $text);
        } catch (\Throwable $e) {
            Log::info('whatsapp: aviso de pedido aplicado não enviado', ['pending' => $this->id, 'error' => $e->getMessage()]);
        }
    }
}
