<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('expenses', function (Blueprint $table) {
            // Identifica de qual cartão/CSV a despesa veio (independente de quem paga ao final).
            $table->enum('source', ['payer1', 'payer2'])->default('payer1')->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('expenses', function (Blueprint $table) {
            $table->dropColumn('source');
        });
    }
};
