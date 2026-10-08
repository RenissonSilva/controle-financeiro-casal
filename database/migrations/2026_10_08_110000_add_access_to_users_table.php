<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Contas vinculadas: o dono (owner) administra tudo; quem entra por convite (member) vê tudo
 * e só edita/exclui o que o dono liberar (`permissions`, ex: ["expenses.edit"]). Sem papel =
 * conta ainda não vinculada, sem acesso aos dados.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('role', 16)->nullable()->after('password');
            $table->json('permissions')->nullable()->after('role');
            $table->timestamp('linked_at')->nullable()->after('permissions');
        });

        // A conta mais antiga é a que já usava o sistema: vira a conta principal.
        $owner = DB::table('users')->orderBy('id')->first();

        if ($owner) {
            DB::table('users')->where('id', $owner->id)->update(['role' => 'owner', 'linked_at' => $owner->created_at ?? now()]);
        }
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['role', 'permissions', 'linked_at']);
        });
    }
};
