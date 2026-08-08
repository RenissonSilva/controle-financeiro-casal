<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('fixed_expenses', function (Blueprint $table) {
            // Período opcional de vigência da cobrança. Fora desse intervalo, a despesa
            // não é projetada no dashboard mesmo que esteja marcada como ativa.
            $table->date('start_date')->nullable()->after('due_day');
            $table->date('end_date')->nullable()->after('start_date');
        });
    }

    public function down(): void
    {
        Schema::table('fixed_expenses', function (Blueprint $table) {
            $table->dropColumn(['start_date', 'end_date']);
        });
    }
};
