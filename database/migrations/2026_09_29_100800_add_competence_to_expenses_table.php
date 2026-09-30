<?php

use App\Models\Setting;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('expenses', function (Blueprint $table) {
            // Fatura do cartão a que a compra pertence (vem do Pluggy quando a fatura fecha).
            $table->date('bill_due_date')->nullable()->after('installment_total');
            $table->date('bill_closing_date')->nullable()->after('bill_due_date');
            // Mês financeiro (Y-m) do lançamento: pela fatura real, no cartão; pela data e pelo
            // dia de fechamento configurado, no resto. Recalculado se o fechamento mudar.
            $table->string('competence', 7)->nullable()->after('date');
            $table->index(['competence', 'kind']);
        });

        $settings = Setting::current();

        DB::table('expenses')->orderBy('id')->each(function ($row) use ($settings) {
            DB::table('expenses')->where('id', $row->id)->update([
                'competence' => $settings->billingCycleForDate($row->date),
            ]);
        });
    }

    public function down(): void
    {
        Schema::table('expenses', function (Blueprint $table) {
            $table->dropIndex(['competence', 'kind']);
            $table->dropColumn(['bill_due_date', 'bill_closing_date', 'competence']);
        });
    }
};
