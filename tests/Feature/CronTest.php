<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class CronTest extends TestCase
{
    use RefreshDatabase;

    public function test_route_does_not_exist_without_cron_secret(): void
    {
        config(['services.cron.secret' => null]);

        $this->get('/cron/openfinance-sync')->assertNotFound();
        $this->get('/cron/openfinance-sync', ['Authorization' => 'Bearer '])->assertNotFound();
    }

    public function test_wrong_secret_is_rejected(): void
    {
        config(['services.cron.secret' => 'segredo']);

        $this->get('/cron/openfinance-sync')->assertNotFound();
        $this->get('/cron/openfinance-sync', ['Authorization' => 'Bearer outro'])->assertNotFound();
    }

    public function test_right_secret_runs_the_sync(): void
    {
        config(['services.cron.secret' => 'segredo']);

        $this->get('/cron/openfinance-sync', ['Authorization' => 'Bearer segredo'])
            ->assertOk()
            ->assertJson(['exit_code' => 0, 'output' => 'Nenhuma conexão Open Finance cadastrada.']);
    }

    public function test_does_not_overlap_a_sync_already_running(): void
    {
        config(['services.cron.secret' => 'segredo']);
        Cache::lock('cron:openfinance-sync', 300)->get();

        $this->get('/cron/openfinance-sync', ['Authorization' => 'Bearer segredo'])->assertStatus(409);
    }
}
