<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('expenses', function (Blueprint $table) {
            // Alcance do "de quem é o gasto" escolhido pelo casal: 'one' = só este lançamento (a memória
            // do categorizador não repete esse dono), 'all' = vale para o estabelecimento, null = nunca escolhido.
            $table->string('ownership_scope', 8)->nullable()->after('ownership');
        });
    }

    public function down(): void
    {
        Schema::table('expenses', function (Blueprint $table) {
            $table->dropColumn('ownership_scope');
        });
    }
};
