<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('fixed_expenses', function (Blueprint $table) {
            // Como reconhecer o pagamento que chega pelo Open Finance: pelo CPF/CNPJ de quem
            // recebe (mais confiável) e/ou por um trecho da descrição.
            $table->string('match_document', 32)->nullable()->after('ownership');
            $table->string('match_pattern')->nullable()->after('match_document');
        });

        // Cada linha passa a representar uma "ocorrência" (cobrança de um mês): pode ter só o
        // valor real ajustado (despesa variável), só o vínculo com o lançamento que a pagou,
        // ou os dois.
        Schema::table('fixed_expense_overrides', function (Blueprint $table) {
            $table->decimal('amount', 12, 2)->nullable()->change();
            $table->foreignId('expense_id')->nullable()->unique()->after('amount')->constrained()->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('fixed_expense_overrides', function (Blueprint $table) {
            $table->dropConstrainedForeignId('expense_id');
        });

        Schema::table('fixed_expenses', function (Blueprint $table) {
            $table->dropColumn(['match_document', 'match_pattern']);
        });
    }
};
