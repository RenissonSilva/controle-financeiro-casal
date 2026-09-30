<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use RuntimeException;

abstract class TestCase extends BaseTestCase
{
    /**
     * Trava de segurança: os testes só rodam num banco cujo nome termina em "_testing" (ou
     * SQLite em memória). Se algo — cache de configuração, variável de ambiente — apontar
     * para outro banco, aborta antes de o RefreshDatabase executar migrate:fresh, que
     * apagaria os dados reais.
     */
    public function createApplication()
    {
        $app = parent::createApplication();

        $connection = $app['config']->get('database.default');
        $database = (string) $app['config']->get("database.connections.{$connection}.database");
        $isTestDatabase = $database === ':memory:' || str_ends_with($database, '_testing');

        if (! $isTestDatabase || ! $app->environment('testing')) {
            throw new RuntimeException(
                "Testes abortados: banco '{$database}' ({$connection}), ambiente '{$app->environment()}'. "
                .'O banco de testes precisa terminar em "_testing" — rode "php artisan config:clear".'
            );
        }

        return $app;
    }
}
