<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // O acerto passa a sair só dos lançamentos: para cobrir meses antigos, basta escolher
        // um mês inicial anterior em vez de digitar um saldo à mão.
        Schema::table('settings', function (Blueprint $table) {
            $table->dropColumn('settlement_opening_balance');
        });
    }

    public function down(): void
    {
        Schema::table('settings', function (Blueprint $table) {
            $table->decimal('settlement_opening_balance', 12, 2)->default(0)->after('settlement_start_month');
        });
    }
};
