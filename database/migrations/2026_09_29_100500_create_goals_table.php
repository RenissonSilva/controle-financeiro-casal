<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('goals', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->decimal('target_amount', 14, 2);
            $table->date('deadline')->nullable();
            // 'investments' = progresso é o saldo investido conectado no Open Finance;
            // 'manual' = progresso informado na mão (manual_amount).
            $table->string('tracking', 12)->default('investments');
            $table->decimal('manual_amount', 14, 2)->default(0);
            // A meta principal aparece no card da Home.
            $table->boolean('is_primary')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('goals');
    }
};
