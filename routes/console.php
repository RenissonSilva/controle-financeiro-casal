<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Sincroniza o Open Finance de madrugada (precisa do cron do "php artisan schedule:run" em produção).
// Em dev, a Home já pede uma sincronização quando os dados têm mais de 6 horas.
Schedule::command('openfinance:sync')->dailyAt('06:30')->withoutOverlapping();
