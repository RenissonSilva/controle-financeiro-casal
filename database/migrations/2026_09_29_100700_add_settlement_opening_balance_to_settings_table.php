<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('settings', function (Blueprint $table) {
            // Quanto o pagador 2 já devia ao pagador 1 no início do ciclo inicial do acerto
            // (negativo = o pagador 1 é quem devia). Acerta a "borda" do saldo corrido.
            $table->decimal('settlement_opening_balance', 12, 2)->default(0)->after('settlement_start_month');
        });
    }

    public function down(): void
    {
        Schema::table('settings', function (Blueprint $table) {
            $table->dropColumn('settlement_opening_balance');
        });
    }
};
