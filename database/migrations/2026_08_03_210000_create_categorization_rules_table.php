<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('categorization_rules', function (Blueprint $table) {
            $table->id();
            // Trecho que deve aparecer na descrição da despesa (case-insensitive, tipo LIKE %pattern%).
            $table->string('pattern');
            // Se informado, a regra só se aplica quando o valor da despesa bater exatamente.
            $table->decimal('amount', 12, 2)->nullable();
            $table->foreignId('category_id')->constrained()->cascadeOnDelete();
            // 'payer1' = só do Pagador1, 'payer2' = só do Pagador2, 'both' = rateado (Nós)
            $table->enum('ownership', ['payer1', 'payer2', 'both'])->default('both');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('categorization_rules');
    }
};
