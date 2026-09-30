<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('expenses', function (Blueprint $table) {
            // Momento exato da compra/transferência, quando o banco informa o horário. Ordena os
            // lançamentos dentro do dia; `date` continua sendo o dia em que aparece no extrato/fatura.
            // Preenchido na próxima sincronização.
            $table->dateTime('occurred_at')->nullable()->after('date');
        });
    }

    public function down(): void
    {
        Schema::table('expenses', function (Blueprint $table) {
            $table->dropColumn('occurred_at');
        });
    }
};
