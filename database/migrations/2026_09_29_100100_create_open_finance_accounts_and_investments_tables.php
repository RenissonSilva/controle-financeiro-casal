<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('open_finance_items', function (Blueprint $table) {
            // CPF/CNPJ do titular da conexão — reconhece transferências para si mesmo.
            $table->string('owner_document', 32)->nullable()->after('owner');
            // Última falha de sincronização, exibida na tela de Contas conectadas.
            $table->text('last_sync_error')->nullable()->after('last_synced_at');
        });

        // Espelho local das contas do Pluggy, atualizado a cada sincronização — a Home lê
        // saldo/limite/vencimento daqui em vez de chamar a API a cada visita.
        Schema::create('open_finance_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('open_finance_item_id')->constrained()->cascadeOnDelete();
            $table->string('external_id')->unique();
            $table->string('type', 10); // BANK | CREDIT
            $table->string('subtype')->nullable();
            $table->string('name')->nullable();
            $table->string('number')->nullable();
            $table->decimal('balance', 14, 2)->default(0);
            $table->string('currency_code', 3)->default('BRL');
            $table->decimal('credit_limit', 14, 2)->nullable();
            $table->decimal('available_credit_limit', 14, 2)->nullable();
            $table->date('bill_due_date')->nullable();
            $table->decimal('minimum_payment', 14, 2)->nullable();
            $table->timestamps();
        });

        Schema::create('open_finance_investments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('open_finance_item_id')->constrained()->cascadeOnDelete();
            $table->string('external_id')->unique();
            $table->string('type')->nullable();
            $table->string('subtype')->nullable();
            $table->string('name')->nullable();
            $table->decimal('balance', 14, 2)->default(0);
            $table->string('status')->nullable(); // ACTIVE | TOTAL_WITHDRAWAL ...
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('open_finance_investments');
        Schema::dropIfExists('open_finance_accounts');

        Schema::table('open_finance_items', function (Blueprint $table) {
            $table->dropColumn(['owner_document', 'last_sync_error']);
        });
    }
};
