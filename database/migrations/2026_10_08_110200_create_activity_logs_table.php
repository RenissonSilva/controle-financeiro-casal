<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Histórico de mudanças: quem mudou o quê. `batch` agrupa o que saiu da mesma ação (uma
 * requisição); `changes` guarda os campos já formatados para leitura ([{label, old, new}]),
 * porque categoria/nome podem mudar ou sumir depois.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('user_name');
            $table->uuid('batch')->index();
            $table->string('area', 20)->index();
            $table->string('action', 20);
            $table->string('subject_type', 60)->nullable();
            $table->unsignedBigInteger('subject_id')->nullable();
            $table->string('description');
            $table->string('subject_label')->nullable();
            $table->json('changes')->nullable();
            $table->timestamp('created_at')->index();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('activity_logs');
    }
};
