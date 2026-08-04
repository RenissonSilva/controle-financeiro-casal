<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('settings', function (Blueprint $table) {
            // Dia do mês em que o cartão fecha/vence. A fatura do mês M cobre
            // do dia card_closing_day de M até card_closing_day - 1 de M+1.
            $table->unsignedTinyInteger('card_closing_day')->default(5);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('settings', function (Blueprint $table) {
            $table->dropColumn('card_closing_day');
        });
    }
};
