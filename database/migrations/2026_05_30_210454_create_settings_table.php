<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('settings', function (Blueprint $table) {
            $table->id();
            $table->string('payer1_name')->default('Pagador 1');
            $table->string('payer2_name')->default('Pagador 2');
            $table->decimal('payer1_salary', 12, 2)->default(0);
            $table->decimal('payer2_salary', 12, 2)->default(0);
            // Percentuais são calculados dinamicamente: payer1_salary / (payer1_salary + payer2_salary)
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('settings');
    }
};
