<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('settings', function (Blueprint $table) {
            // CPFs/CNPJs do pagador 2 — Pix de/para esses documentos vão para o acerto do
            // casal em vez de contar como receita/despesa.
            $table->json('payer2_documents')->nullable()->after('payer2_salary');
            // Primeiro ciclo (Y-m) considerado no saldo corrido do acerto.
            $table->string('settlement_start_month', 7)->nullable()->after('card_closing_day');
        });
    }

    public function down(): void
    {
        Schema::table('settings', function (Blueprint $table) {
            $table->dropColumn(['payer2_documents', 'settlement_start_month']);
        });
    }
};
