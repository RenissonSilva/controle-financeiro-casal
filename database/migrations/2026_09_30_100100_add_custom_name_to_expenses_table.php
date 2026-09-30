<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('expenses', function (Blueprint $table) {
            // Nome amigável dado pelo casal ("INCENTIVE" → "Cinefy"). Vale para todos os lançamentos
            // com a mesma descrição do banco, inclusive os que chegarem nas próximas sincronizações.
            $table->string('custom_name')->nullable()->after('description');
            $table->index('description');
        });
    }

    public function down(): void
    {
        Schema::table('expenses', function (Blueprint $table) {
            $table->dropIndex(['description']);
            $table->dropColumn('custom_name');
        });
    }
};
