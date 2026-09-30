<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('expenses', function (Blueprint $table) {
            // De onde o lançamento veio: 'open_finance' (Pluggy), 'manual' ou 'csv' (legado,
            // removido na reconstrução pelo Pluggy). Não confundir com `source`, que diz
            // de quem é o cartão/conta que pagou (payer1/payer2).
            $table->string('origin', 12)->default('manual')->after('source');
            $table->foreignId('open_finance_item_id')->nullable()->after('origin')->constrained()->nullOnDelete();
            // Id da transação e da conta no Pluggy.
            $table->string('external_id')->nullable()->unique()->after('open_finance_item_id');
            $table->string('account_id')->nullable()->after('external_id');
            // BANK (conta) ou CREDIT (cartão) — decide o que é pagamento de fatura, estorno etc.
            $table->string('account_type', 10)->nullable()->after('account_id');

            // Sentido do dinheiro na conta de origem: 'out' (saiu) ou 'in' (entrou).
            // `amount` continua sempre positivo; estorno = despesa com direction 'in'.
            $table->string('direction', 3)->default('out')->after('amount');
            // Como o lançamento entra nos cálculos: 'expense' (despesa), 'income' (receita),
            // 'settlement' (Pix entre o casal, vai para o acerto) ou 'ignored' (fora de tudo:
            // pagamento de fatura, aplicação/resgate, transferência para si mesmo...).
            $table->string('kind', 12)->default('expense')->after('direction');
            // Motivo da classificação automática (ex: bill_payment, investment, own_transfer).
            $table->string('kind_reason', 20)->nullable()->after('kind');
            // true quando o usuário escolheu o tipo na mão — a sincronização não reclassifica.
            $table->boolean('kind_locked')->default(false)->after('kind_reason');

            // Quem definiu a categoria/quem paga: user | rule | memory | ai | fixed.
            // 'user' nunca é sobrescrito por sincronização, regra ou IA.
            $table->string('category_source', 10)->nullable()->after('category_id');

            // Dados vindos do banco (Pluggy).
            $table->string('bank_status', 10)->nullable()->after('status'); // PENDING | POSTED
            $table->string('bank_category')->nullable()->after('bank_status');
            $table->string('counterparty_name')->nullable()->after('bank_category');
            $table->string('counterparty_document', 32)->nullable()->after('counterparty_name');
            // Compra em moeda estrangeira: `amount` fica em R$, o original fica aqui.
            $table->decimal('original_amount', 12, 2)->nullable()->after('counterparty_document');
            $table->string('currency_code', 3)->nullable()->after('original_amount');
            $table->unsignedSmallInteger('installment_number')->nullable()->after('currency_code');
            $table->unsignedSmallInteger('installment_total')->nullable()->after('installment_number');

            // Observação editável pelo usuário. `description` (nome do banco) é imutável.
            $table->text('notes')->nullable()->after('description');

            $table->index('date');
            $table->index(['kind', 'date']);
        });

        // Classifica a origem das linhas existentes a partir do antigo import_hash.
        DB::table('expenses')->where('import_hash', 'like', 'pluggy_%')->update(['origin' => 'open_finance']);
        DB::table('expenses')->whereNotNull('import_hash')->where('import_hash', 'not like', 'pluggy_%')->update(['origin' => 'csv']);

        DB::table('expenses')->where('origin', 'open_finance')->orderBy('id')->each(function ($row) {
            DB::table('expenses')->where('id', $row->id)->update([
                'external_id' => substr($row->import_hash, strlen('pluggy_')),
            ]);
        });

        Schema::table('expenses', function (Blueprint $table) {
            $table->dropUnique(['import_hash']);
            $table->dropColumn('import_hash');
        });
    }

    public function down(): void
    {
        Schema::table('expenses', function (Blueprint $table) {
            $table->string('import_hash')->nullable()->unique();
        });

        DB::table('expenses')->whereNotNull('external_id')->orderBy('id')->each(function ($row) {
            DB::table('expenses')->where('id', $row->id)->update(['import_hash' => 'pluggy_'.$row->external_id]);
        });

        Schema::table('expenses', function (Blueprint $table) {
            $table->dropIndex(['kind', 'date']);
            $table->dropIndex(['date']);
            $table->dropConstrainedForeignId('open_finance_item_id');
            $table->dropUnique(['external_id']);
            $table->dropColumn([
                'origin', 'external_id', 'account_id', 'account_type', 'direction', 'kind', 'kind_reason',
                'kind_locked', 'category_source', 'bank_status', 'bank_category', 'counterparty_name',
                'counterparty_document', 'original_amount', 'currency_code', 'installment_number',
                'installment_total', 'notes',
            ]);
        });
    }
};
