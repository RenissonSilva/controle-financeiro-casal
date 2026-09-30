<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('settings', function (Blueprint $table) {
            // Receita que cai até N dias antes do início de um ciclo conta nesse ciclo
            // (ex: salário adiantado para o dia 3 quando o ciclo começa no dia 5).
            $table->unsignedTinyInteger('income_grace_days')->default(5)->after('card_closing_day');
        });
    }

    public function down(): void
    {
        Schema::table('settings', function (Blueprint $table) {
            $table->dropColumn('income_grace_days');
        });
    }
};
