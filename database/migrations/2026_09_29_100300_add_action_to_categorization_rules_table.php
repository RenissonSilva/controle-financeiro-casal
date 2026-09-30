<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('categorization_rules', function (Blueprint $table) {
            // 'categorize' aplica categoria + quem paga; 'ignore' tira o lançamento dos
            // cálculos (ex: Pix para uma conta sua em outro banco).
            $table->string('action', 12)->default('categorize')->after('pattern');
            $table->foreignId('category_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('categorization_rules', function (Blueprint $table) {
            $table->dropColumn('action');
        });
    }
};
