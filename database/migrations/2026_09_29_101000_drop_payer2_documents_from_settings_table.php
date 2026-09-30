<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('settings', function (Blueprint $table) {
            $table->dropColumn('payer2_documents');
        });

        // Pix de/para o parceiro deixaram de virar acerto sozinhos. Os que já tinham sido
        // classificados assim continuam acerto, travados como se o usuário os tivesse marcado.
        DB::table('expenses')
            ->where('kind', 'settlement')
            ->where('kind_reason', 'partner')
            ->update(['kind_reason' => null, 'kind_locked' => true]);
    }

    public function down(): void
    {
        Schema::table('settings', function (Blueprint $table) {
            $table->json('payer2_documents')->nullable()->after('payer2_salary');
        });
    }
};
