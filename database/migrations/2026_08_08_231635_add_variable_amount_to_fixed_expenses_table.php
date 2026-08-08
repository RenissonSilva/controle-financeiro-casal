<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('fixed_expenses', function (Blueprint $table) {
            // Quando true, "amount" é tratado como valor estimado (ex: conta de luz), e o valor
            // real de cada mês pode ser ajustado via fixed_expense_overrides.
            $table->boolean('variable_amount')->default(false)->after('amount');
        });
    }

    public function down(): void
    {
        Schema::table('fixed_expenses', function (Blueprint $table) {
            $table->dropColumn('variable_amount');
        });
    }
};
