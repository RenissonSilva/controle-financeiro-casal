<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('fixed_expense_overrides', function (Blueprint $table) {
            // true quando o usuário desfez um vínculo automático — a sincronização não
            // tenta vincular essa ocorrência de novo (só o vínculo manual continua possível).
            $table->boolean('skip_auto_match')->default(false)->after('expense_id');
        });
    }

    public function down(): void
    {
        Schema::table('fixed_expense_overrides', function (Blueprint $table) {
            $table->dropColumn('skip_auto_match');
        });
    }
};
