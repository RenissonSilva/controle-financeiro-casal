<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Guarda o valor real de uma cobrança específica (identificada pela data de vencimento)
        // de uma despesa fixa de valor variável, sem alterar a estimativa base cadastrada.
        Schema::create('fixed_expense_overrides', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fixed_expense_id')->constrained()->cascadeOnDelete();
            $table->date('due_date');
            $table->decimal('amount', 12, 2);
            $table->timestamps();

            $table->unique(['fixed_expense_id', 'due_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fixed_expense_overrides');
    }
};
