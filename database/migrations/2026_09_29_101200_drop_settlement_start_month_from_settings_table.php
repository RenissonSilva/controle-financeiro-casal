<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // O acerto deixou de ser saldo corrido: mostra só o que o pagador 2 deve em cada mês,
        // pelos lançamentos, então não há mais mês inicial.
        Schema::table('settings', function (Blueprint $table) {
            $table->dropColumn('settlement_start_month');
        });
    }

    public function down(): void
    {
        Schema::table('settings', function (Blueprint $table) {
            $table->string('settlement_start_month', 7)->nullable()->after('card_closing_day');
        });
    }
};
