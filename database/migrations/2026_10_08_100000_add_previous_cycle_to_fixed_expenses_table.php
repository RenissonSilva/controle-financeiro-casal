<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('fixed_expenses', function (Blueprint $table) {
            // Conta do mês anterior (energia: consumo de setembro pago no começo de outubro): o
            // pagamento conta nos gastos do ciclo anterior ao da cobrança.
            $table->boolean('previous_cycle')->default(false)->after('variable_amount');
        });

        Schema::table('expenses', function (Blueprint $table) {
            // Ciclos somados à competência calculada pela data (-1 = pagamento de conta do mês anterior).
            $table->tinyInteger('competence_shift')->default(0)->after('competence');
        });
    }

    public function down(): void
    {
        Schema::table('expenses', function (Blueprint $table) {
            $table->dropColumn('competence_shift');
        });

        Schema::table('fixed_expenses', function (Blueprint $table) {
            $table->dropColumn('previous_cycle');
        });
    }
};
