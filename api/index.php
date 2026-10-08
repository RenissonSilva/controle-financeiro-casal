<?php

/**
 * Entrada da Vercel (runtime vercel-php, ver vercel.json). Lá o disco é só leitura, fora o
 * /tmp: storage, caches do bootstrap e views compiladas vão para lá, e o resto é o Laravel
 * normal. Fora da Vercel este arquivo não é usado.
 */
$tmp = rtrim(sys_get_temp_dir(), '/');

$defaults = [
    'VERCEL' => '1',
    'LARAVEL_STORAGE_PATH' => "{$tmp}/storage",
    'APP_CONFIG_CACHE' => "{$tmp}/bootstrap/config.php",
    'APP_EVENTS_CACHE' => "{$tmp}/bootstrap/events.php",
    'APP_PACKAGES_CACHE' => "{$tmp}/bootstrap/packages.php",
    'APP_ROUTES_CACHE' => "{$tmp}/bootstrap/routes.php",
    'APP_SERVICES_CACHE' => "{$tmp}/bootstrap/services.php",
    'VIEW_COMPILED_PATH' => "{$tmp}/storage/framework/views",
    'LOG_CHANNEL' => 'stderr',
];

foreach ($defaults as $key => $value) {
    if (getenv($key) === false) {
        putenv("{$key}={$value}");
        $_ENV[$key] = $_SERVER[$key] = $value;
    }
}

foreach (['bootstrap', 'storage/framework/views', 'storage/framework/cache/data', 'storage/logs', 'storage/fonts'] as $dir) {
    is_dir("{$tmp}/{$dir}") || mkdir("{$tmp}/{$dir}", 0755, true);
}

require __DIR__.'/../public/index.php';
