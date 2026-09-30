<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Regras de nome personalizado: filtro no estilo LIKE ("Amazon %") → nome amigável.
        Schema::create('name_rules', function (Blueprint $table) {
            $table->id();
            $table->string('pattern')->unique();
            $table->string('name');
            $table->timestamps();
        });

        Schema::table('expenses', function (Blueprint $table) {
            // Regra que deu o `custom_name` deste lançamento (o nome fica copiado para listar/buscar rápido).
            $table->foreignId('name_rule_id')->nullable()->after('custom_name')->constrained('name_rules')->nullOnDelete();
        });

        // Nomes dados antes das regras viram regras de descrição exata.
        DB::table('expenses')->whereNotNull('custom_name')->orderBy('updated_at')->get(['id', 'description', 'custom_name'])
            ->each(function ($expense) {
                $pattern = addcslashes($expense->description, '%_\\');
                $ruleId = DB::table('name_rules')->where('pattern', $pattern)->value('id')
                    ?? DB::table('name_rules')->insertGetId(['pattern' => $pattern, 'name' => $expense->custom_name, 'created_at' => now(), 'updated_at' => now()]);

                DB::table('expenses')->where('id', $expense->id)->update(['name_rule_id' => $ruleId]);
            });
    }

    public function down(): void
    {
        Schema::table('expenses', function (Blueprint $table) {
            $table->dropConstrainedForeignId('name_rule_id');
        });

        Schema::dropIfExists('name_rules');
    }
};
