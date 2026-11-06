<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('expenses', function (Blueprint $table) {
            // Divisão definida à mão num gasto "Nós": quanto do `amount` é do pagador 1 (o pagador 2
            // fica com o resto). Null = divide pela proporção de renda.
            $table->decimal('payer1_share', 12, 2)->nullable()->after('ownership_scope');
        });
    }

    public function down(): void
    {
        Schema::table('expenses', function (Blueprint $table) {
            $table->dropColumn('payer1_share');
        });
    }
};
