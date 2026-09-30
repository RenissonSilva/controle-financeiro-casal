<?php

namespace App\Support;

use App\Models\CategorizationRule;
use App\Models\Expense;

/**
 * Empresa por trás de um lançamento, para mostrar a logo nas listas. Os padrões são
 * procurados na descrição do banco e no nome de quem recebeu/pagou, já normalizados
 * (minúsculas, sem acento). A ordem importa: vence o primeiro que bater.
 *
 * Para incluir uma empresa: adicionar a linha aqui e a logo em
 * public/images/merchants/{slug}.png (quadrada, 96×96, fundo opaco — a tela recorta em círculo).
 */
class MerchantLogo
{
    /** @var array<string, array{0: string, 1: string}> slug => [nome, regex] */
    public const BRANDS = [
        'amazon' => ['Amazon', '/\bamazon/'],
        'ifood' => ['iFood', '/ifood|\bifd ?\*/'],
        'uber' => ['Uber', '/\buber/'],
        'drogaraia' => ['Droga Raia', '/droga ?raia/'],
        'drogasil' => ['Drogasil', '/drogasil/'],
        'mateus' => ['Mateus', '/\bmix mateus|mateus supermercados|\bgrupo mateus|armazem mateus/'],
        'steam' => ['Steam', '/\bsteam\b|steampowered/'],
        'spotify' => ['Spotify', '/spotify/'],
        'hbomax' => ['HBO Max', '/hbo ?max/'],
        'youtube' => ['YouTube', '/youtub/'],
        'googleplay' => ['Google Play', '/\bgoogle\b/'],
        'vivo' => ['Vivo', '/\bvivo\b|telefonica brasil/'],
        'neoenergia' => ['Neoenergia', '/neoenergia|companhia energetica de pernambuco|\bcelpe\b/'],
        'shopee' => ['Shopee', '/shopee|\bshpp\b/'],
        'shein' => ['Shein', '/\bshein\b/'],
        'mercadolivre' => ['Mercado Livre', '/mercado ?livre/'],
        'airbnb' => ['Airbnb', '/airbnb/'],
        'azul' => ['Azul', '/\bazul linhas|voeazul/'],
        'microsoft' => ['Microsoft', '/microsoft|\bxbox\b/'],
        'claude' => ['Claude', '/anthropic|claude\.ai/'],
        'github' => ['GitHub', '/github/'],
        'playstation' => ['PlayStation', '/playstation/'],
        'kfc' => ['KFC', '/\bkfc\b/'],
        'burgerking' => ['Burger King', '/burger ?king/'],
        'subway' => ['Subway', '/\bsubway\b/'],
        'renner' => ['Renner', '/\brenner\b/'],
        'riachuelo' => ['Riachuelo', '/riachuelo/'],
        'cea' => ['C&A', '/^cea npa\b|\bc&a modas\b/'],
        'boticario' => ['O Boticário', '/boticario/'],
        'americanas' => ['Americanas', '/americanas|^lasa\b/'],
        'olympikus' => ['Olympikus', '/olympikus/'],
        'nuuvem' => ['Nuuvem', '/nuuvem/'],
        'ingresso' => ['Ingresso.com', '/ingresso\.com/'],
        'tripcom' => ['Trip.com', '/trip\.com/'],
        'webcontinental' => ['WebContinental', '/web ?continen/'],
        'qconcursos' => ['Qconcursos', '/qconcursos/'],
        'gran' => ['Gran', '/\bgran (educacao|cursos)/'],
        'exitlag' => ['ExitLag', '/exitlag/'],
        'g2a' => ['G2A', '/\bg2a\b/'],
        'gog' => ['GOG', '/\bgog\b/'],
        'cursor' => ['Cursor', '/\bcursor\b/'],
        'windsurf' => ['Windsurf', '/windsurf|codeium/'],
        'manual' => ['Manual', '/manual saude/'],
        'uhuu' => ['Uhuu', '/\buhuu\b/'],
        'getninjas' => ['GetNinjas', '/getninjas/'],

        // Comércio local e contas da casa.
        'novoatacarejo' => ['Novo Atacarejo', '/novo atacarejo|novo atacado comercio/'],
        'frosty' => ['Frosty', '/\bfrosty\b/'],
        'northway' => ['North Way', '/north ?way/'],
        'pastel' => ['Pastel da Taty', '/pasteldataty|pastel da taty/'],
        'growth' => ['Growth Supplements', '/growth ?supplements/'],
        'topfitness' => ['Top Fitness', '/top fitt?iness|^top$/'],
        'cinefy' => ['Cinefy', '/cinefy|\bincentive\b/'],
        'malu' => ['Malu Market', '/malu market|marcelo hen/'],
        'nira' => ['Nirá', '/\bnira\b|nrizakay/'],
        'newlink' => ['New Link', '/new link connect/'],
        'silene' => ["Silene's Truck", '/silene/'],
        'aluguel' => ['Aluguel', null],
    ];

    /**
     * CPF/CNPJ de quem recebe => slug, para quando o nome não diz qual é a empresa (ex: o
     * aluguel é Pix para a pessoa física da locadora). São os mesmos documentos das contas fixas.
     */
    public const DOCUMENTS = [
        '06725770460' => 'aluguel',
        '30565850000106' => 'newlink',
    ];

    /** @return array{slug: string, name: string, logo: string}|null */
    public static function for(Expense $expense): ?array
    {
        return self::forDocument($expense->counterparty_document)
            ?? self::match($expense->description, $expense->counterparty_name);
    }

    /** @return array{slug: string, name: string, logo: string}|null */
    public static function forDocument(?string $document): ?array
    {
        $slug = self::DOCUMENTS[(string) $document] ?? null;

        return $slug ? self::brand($slug) : null;
    }

    /** @return array{slug: string, name: string, logo: string}|null */
    public static function match(?string ...$texts): ?array
    {
        $texts = array_filter(array_map(fn (?string $text) => CategorizationRule::normalize($text), $texts));

        foreach (self::BRANDS as $slug => [, $pattern]) {
            foreach ($texts as $text) {
                if ($pattern && preg_match($pattern, $text)) {
                    return self::brand($slug);
                }
            }
        }

        return null;
    }

    /** @return array{slug: string, name: string, logo: string} */
    private static function brand(string $slug): array
    {
        return ['slug' => $slug, 'name' => self::BRANDS[$slug][0], 'logo' => asset("images/merchants/{$slug}.png")];
    }
}
