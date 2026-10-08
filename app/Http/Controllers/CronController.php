<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

/**
 * Agendamento por HTTP, para onde não existe "php artisan schedule:run" (Vercel: crons do
 * vercel.json mandam "Authorization: Bearer <CRON_SECRET>"). Sem CRON_SECRET a rota não existe.
 */
class CronController extends Controller
{
    public function openFinanceSync(Request $request): JsonResponse
    {
        $secret = config('services.cron.secret');

        abort_unless($secret && hash_equals("Bearer {$secret}", (string) $request->header('Authorization')), 404);

        set_time_limit(300);

        // Mesmo papel do withoutOverlapping() do agendamento em routes/console.php.
        $lock = Cache::lock('cron:openfinance-sync', 300);

        if (! $lock->get()) {
            return response()->json(['status' => 'already-running'], 409);
        }

        try {
            $exitCode = Artisan::call('openfinance:sync');
        } finally {
            $lock->release();
        }

        $output = trim(Artisan::output());
        Log::info('cron openfinance:sync', ['exit_code' => $exitCode, 'output' => $output]);

        return response()->json(['exit_code' => $exitCode, 'output' => $output], $exitCode === 0 ? 200 : 500);
    }
}
