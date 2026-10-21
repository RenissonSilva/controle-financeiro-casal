<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// "De quem é" pedido pelo bot para uma compra que ainda não chegou do banco: aplicado na
// sincronização em que ela aparecer (ver PendingOwnership).
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pending_ownerships', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            // Para onde avisar quando aplicar (o "from" da mensagem no WhatsApp).
            $table->string('chat_id', 32)->nullable();
            $table->string('query');
            $table->decimal('amount', 12, 2)->nullable();
            $table->date('from_date');
            $table->date('to_date');
            $table->string('ownership', 8);
            $table->timestamp('expires_at');
            $table->timestamp('applied_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pending_ownerships');
    }
};
