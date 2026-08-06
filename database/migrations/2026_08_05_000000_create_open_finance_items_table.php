<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('open_finance_items', function (Blueprint $table) {
            $table->id();
            // ID do "item" retornado pelo Pluggy Connect (representa a conexão com o banco).
            $table->string('item_id')->unique();
            $table->string('connector_name')->nullable();
            // Dono da conexão bancária, mapeia para o campo `source` das despesas importadas.
            $table->enum('owner', ['payer1', 'payer2'])->default('payer1');
            // Status vindo do Pluggy: UPDATED, LOGIN_ERROR, OUTDATED, UPDATING, etc.
            $table->string('status')->default('UPDATING');
            $table->timestamp('last_synced_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('open_finance_items');
    }
};
