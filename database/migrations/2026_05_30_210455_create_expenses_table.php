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
        Schema::create('expenses', function (Blueprint $table) {
            $table->id();
            $table->string('description');
            $table->decimal('amount', 12, 2);
            $table->date('date');
            $table->foreignId('category_id')->nullable()->constrained()->nullOnDelete();
            // 'payer1' = só do Pagador1, 'payer2' = só do Pagador2, 'both' = rateado pela % de renda
            $table->enum('ownership', ['payer1', 'payer2', 'both'])->default('both');
            // 'pending' enquanto aguarda categorização da IA, 'categorized' quando concluído
            $table->enum('status', ['pending', 'categorized'])->default('pending');
            $table->string('import_hash')->nullable()->unique(); // evita duplicatas no reimport
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('expenses');
    }
};
