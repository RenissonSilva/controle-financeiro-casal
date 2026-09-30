<?php

namespace Tests\Feature;

use App\Models\Expense;
use App\Support\MerchantLogo;
use Tests\TestCase;

class MerchantLogoTest extends TestCase
{
    private static function slug(?string ...$texts): ?string
    {
        return MerchantLogo::match(...$texts)['slug'] ?? null;
    }

    public function test_recognizes_card_descriptions_with_processor_prefixes(): void
    {
        $this->assertSame('amazon', self::slug('Amazon Credito AMZ'));
        $this->assertSame('amazon', self::slug('Amazonmktplc*Madeirama 2/4'));
        $this->assertSame('amazon', self::slug('Amazonprimebr'));
        $this->assertSame('ifood', self::slug('Ifd*Vip Lanches'));
        $this->assertSame('uber', self::slug('Dl*Uberrides'));
        $this->assertSame('steam', self::slug('Pag*Steam 2/2'));
        $this->assertSame('spotify', self::slug('Ebn*Spotify'));
        $this->assertSame('hbomax', self::slug('Dm*Helphbomaxcom'));
    }

    public function test_more_specific_brand_wins(): void
    {
        $this->assertSame('drogaraia', self::slug('Pg *Drogaraia 1/3'));
        $this->assertSame('drogasil', self::slug('Raiadrogasilsa'));
        $this->assertSame('youtube', self::slug('Dl*Google Youtub'));
        $this->assertSame('googleplay', self::slug('Google Fitify Fitness'));
    }

    public function test_pix_matches_by_receiver_name(): void
    {
        $this->assertSame('neoenergia', self::slug('Transferência enviada|COMPANHIA ENERGETICA DE PERNAMBUCO', 'COMPANHIA ENERGETICA DE PERNAMBUCO'));
        $this->assertSame('ifood', self::slug('Compra no débito via NuPay|iFood', 'IFOOD.COM AGENCIA DE RESTAURANTES ONLINE S.A.'));
    }

    public function test_local_merchants(): void
    {
        $this->assertSame('novoatacarejo', self::slug('Novo Atacarejo Marangu'));
        $this->assertSame('novoatacarejo', self::slug('Transferência enviada|NOVO ATACADO COMERCIO DE ALIMENTOS SA'));
        $this->assertSame('pastel', self::slug('Mp *Pasteldataty'));
        $this->assertSame('northway', self::slug('Pws Paulista North Way'));
        $this->assertSame('topfitness', self::slug('TOP FITINESS 5 3/6'));
        $this->assertSame('topfitness', self::slug('Top'));
        $this->assertSame('cinefy', self::slug('Transferência enviada|INCENTIVE PAGAMENTOS LTDA'));
    }

    public function test_rent_is_recognized_by_the_receiver_document(): void
    {
        $rent = new Expense(['description' => 'Transferência enviada|Amanda Siqueira Lima da Silva', 'counterparty_document' => '06725770460']);
        $other = new Expense(['description' => 'Transferência enviada|Amanda Siqueira Lima da Silva', 'counterparty_document' => '99999999999']);

        $this->assertSame('aluguel', MerchantLogo::for($rent)['slug']);
        $this->assertNull(MerchantLogo::for($other));
    }

    public function test_unknown_merchants_and_people_have_no_logo(): void
    {
        $this->assertNull(self::slug('Stm Paulista'));
        $this->assertNull(self::slug('Mp *Barbearia22dejulho'));
        $this->assertNull(self::slug('Transferência enviada|Claude Duarte', 'Claude Duarte'));
        $this->assertNull(self::slug('Transferência enviada|Mateus Gomes', 'Mateus Gomes'));
        $this->assertNull(self::slug(null, ''));
    }

    public function test_every_brand_has_a_logo_file(): void
    {
        foreach (array_keys(MerchantLogo::BRANDS) as $slug) {
            $this->assertFileExists(public_path("images/merchants/{$slug}.png"), "Falta a logo de {$slug}");
        }
    }
}
