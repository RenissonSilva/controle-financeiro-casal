<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;

class CategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            ['name' => 'Alimentação',   'color' => '#f59e0b'],
            ['name' => 'Transporte',    'color' => '#3b82f6'],
            ['name' => 'Lazer',         'color' => '#8b5cf6'],
            ['name' => 'Moradia',       'color' => '#10b981'],
            ['name' => 'Saúde',         'color' => '#ef4444'],
            ['name' => 'Educação',      'color' => '#06b6d4'],
            ['name' => 'Vestuário',     'color' => '#ec4899'],
            ['name' => 'Assinaturas',   'color' => '#f97316'],
            ['name' => 'Serviços',      'color' => '#64748b'],
            ['name' => 'Outros',        'color' => '#94a3b8'],
        ];

        foreach ($categories as $cat) {
            Category::firstOrCreate(['name' => $cat['name']], $cat);
        }
    }
}
