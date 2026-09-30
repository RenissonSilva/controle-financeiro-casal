<?php

namespace App\Services\Finance;

use App\Models\CategorizationRule;
use App\Models\Expense;
use App\Models\FixedExpense;
use App\Models\FixedExpenseOverride;
use App\Models\Setting;
use Illuminate\Support\Carbon;

/**
 * Vincula cada cobrança de conta fixa ao lançamento que a pagou (ex: Pix para o CPF da
 * locadora → Aluguel). Conta vinculada = paga: o valor real já está no lançamento, então a
 * conta fixa deixa de ser projetada e nada é contado duas vezes.
 *
 * O pagamento é procurado dentro do mesmo ciclo (mês financeiro) da cobrança, escolhendo o
 * candidato de data mais próxima do vencimento.
 */
class FixedExpenseMatcher
{
    public function __construct(private readonly Setting $settings) {}

    public static function make(): self
    {
        return new self(Setting::current());
    }

    // Vincula todos os ciclos que tocam o intervalo de datas informado.
    public function matchBetween(Carbon $from, Carbon $to): int
    {
        $month = $this->settings->billingCycleForDate($from);
        $last = $this->settings->billingCycleForDate($to);
        $linked = 0;

        while ($month <= $last) {
            $linked += $this->matchCycle($month);
            $month = Setting::shiftCycle($month, 1);
        }

        return $linked;
    }

    public function matchCycle(string $month): int
    {
        [$start, $end] = $this->settings->billingCycleRange($month);

        $fixedExpenses = FixedExpense::where('active', true)->get()->filter->hasPaymentMatcher();

        if ($fixedExpenses->isEmpty()) {
            return 0;
        }

        $candidates = Expense::ofKind(Expense::KIND_EXPENSE)
            ->where('direction', 'out')
            ->inCompetence($month)
            ->whereDoesntHave('fixedOccurrence')
            ->get();

        $linked = 0;

        foreach ($fixedExpenses as $fixedExpense) {
            $dueDate = $fixedExpense->dueDateInRange($start, $end);

            if (! $dueDate) {
                continue;
            }

            $occurrence = FixedExpenseOverride::firstOrNew([
                'fixed_expense_id' => $fixedExpense->id,
                'due_date' => $dueDate->toDateString(),
            ]);

            if ($occurrence->expense_id || $occurrence->skip_auto_match) {
                continue;
            }

            $payment = $candidates
                ->filter(fn (Expense $expense) => self::matches($fixedExpense, $expense))
                ->sortBy(fn (Expense $expense) => abs($expense->date->diffInDays($dueDate)))
                ->first();

            if (! $payment) {
                continue;
            }

            $occurrence->expense_id = $payment->id;
            $occurrence->save();
            $this->applyFixedCategory($fixedExpense, $payment);

            $candidates = $candidates->reject(fn (Expense $expense) => $expense->id === $payment->id);
            $linked++;
        }

        return $linked;
    }

    public static function matches(FixedExpense $fixedExpense, Expense $expense): bool
    {
        $document = preg_replace('/\D/', '', (string) $fixedExpense->match_document);

        if ($document !== '' && $expense->counterparty_document === $document) {
            return true;
        }

        $pattern = CategorizationRule::normalize($fixedExpense->match_pattern);

        if ($pattern === '') {
            return false;
        }

        return str_contains(CategorizationRule::normalize($expense->description), $pattern)
            || str_contains(CategorizationRule::normalize($expense->counterparty_name), $pattern);
    }

    // O pagamento herda categoria e divisão da conta fixa, a menos que o usuário já tenha escolhido.
    public function applyFixedCategory(FixedExpense $fixedExpense, Expense $payment): void
    {
        if ($payment->category_source === 'user') {
            return;
        }

        $payment->update(array_filter([
            'category_id' => $fixedExpense->category_id ?? $payment->category_id,
            'ownership' => $fixedExpense->ownership,
            'category_source' => 'fixed',
            'status' => 'categorized',
        ], fn ($value) => $value !== null));
    }
}
