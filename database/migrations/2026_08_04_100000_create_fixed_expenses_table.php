<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fixed_expenses', function (Blueprint $table) {
            $table->id();
            $table->string('description');
            $table->decimal('amount', 12, 2);
            // Dia do mês em que a cobrança cai (1-31, ajustado para o último dia em meses menores).
            $table->unsignedTinyInteger('due_day');
            $table->foreignId('category_id')->nullable()->constrained()->nullOnDelete();
            // 'payer1' = só do Pagador1, 'payer2' = só do Pagador2, 'both' = rateado (Nós)
            $table->enum('ownership', ['payer1', 'payer2', 'both'])->default('both');
            $table->boolean('active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fixed_expenses');
    }
};
