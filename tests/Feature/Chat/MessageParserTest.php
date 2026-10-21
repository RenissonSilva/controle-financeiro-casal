<?php

namespace Tests\Feature\Chat;

use App\Models\Setting;
use App\Services\Chat\MessageParser;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class MessageParserTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Quarta-feira.
        Carbon::setTestNow('2026-10-21 10:00:00');
        Setting::current()->update(['payer1_name' => 'Reni', 'payer2_name' => 'Lua']);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    // [dono, palavras, de, até, valor] de um pedido de "de quem é".
    private function ownership(string $text): array
    {
        $parsed = (new MessageParser)->parse($text);
        $this->assertSame('ownership', $parsed['intent'], $text);

        return [$parsed['owner'], $parsed['words'], $parsed['from']->toDateString(), $parsed['to']->toDateString(), $parsed['amount']];
    }

    public function test_owner_date_and_name(): void
    {
        $this->assertSame(['self', ['uber'], '2026-10-20', '2026-10-20', null], $this->ownership('uber de ontem meu'));
        $this->assertSame(['other', ['drogasil'], '2026-10-21', '2026-10-21', null], $this->ownership('Drogasil de hoje dela'));
        $this->assertSame(['both', ['ifood'], '2026-10-16', '2026-10-16', 45.9], $this->ownership('iFood 45,90 sexta nosso'));
        $this->assertSame(['payer2', ['mercado'], '2026-09-25', '2026-09-25', 1234.56], $this->ownership('Mercado 1.234,56 dia 25 da Lua'));
        $this->assertSame(['payer1', ['posto'], '2026-10-15', '2026-10-21', 50.0], $this->ownership('R$ 50 posto do Reni'));
        $this->assertSame(['both', ['99'], '2026-10-18', '2026-10-18', null], $this->ownership('99 de 18/10 dividido'));
        $this->assertSame(['self', ['uber'], '2026-10-19', '2026-10-19', null], $this->ownership('a uber que eu peguei anteontem à noite é minha'));
        $this->assertSame(['both', ['farmacia'], '2026-10-15', '2026-10-21', null], $this->ownership('farmácia dos dois'));
        $this->assertSame(['other', ['amazon', 'livro'], '2026-10-19', '2026-10-19', null], $this->ownership('amazon livro segunda-feira dele'));
    }

    public function test_future_date_without_year_is_last_year(): void
    {
        $this->assertSame(['self', ['presente'], '2025-12-25', '2025-12-25', null], $this->ownership('25/12 presente meu'));
        $this->assertSame(['self', ['presente'], '2026-09-30', '2026-09-30', null], $this->ownership('30/09/2026 presente meu'));
    }

    public function test_choices_settlement_and_help(): void
    {
        $parser = new MessageParser;

        $this->assertSame(['intent' => 'choice', 'choices' => [2]], $parser->parse('2'));
        $this->assertSame(['intent' => 'choice', 'choices' => [1, 3]], $parser->parse('1 e 3'));
        $this->assertSame(['intent' => 'choice', 'choices' => 'all'], $parser->parse('Todos'));
        $this->assertSame(['intent' => 'settlement'], $parser->parse('Quanto a Lua deve?'));
        $this->assertSame(['intent' => 'settlement'], $parser->parse('acerto'));
        $this->assertSame(['intent' => 'help'], $parser->parse('Oi!'));
        // Sem dizer de quem é não dá para mudar nada.
        $this->assertSame(['intent' => 'help'], $parser->parse('uber de ontem'));
    }
}
