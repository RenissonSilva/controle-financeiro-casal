<?php

namespace App\Http\Controllers;

use App\Models\Goal;
use App\Models\OpenFinanceInvestment;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class GoalController extends Controller
{
    public function index(): Response
    {
        $invested = (float) OpenFinanceInvestment::sum('balance');

        return Inertia::render('Goals', [
            'goals' => Goal::orderByDesc('is_primary')->orderBy('deadline')->orderBy('id')->get()->map(fn (Goal $goal) => [
                'id' => $goal->id,
                'name' => $goal->name,
                'target_amount' => $goal->target_amount,
                'deadline' => $goal->deadline?->toDateString(),
                'tracking' => $goal->tracking,
                'manual_amount' => $goal->manual_amount,
                'is_primary' => $goal->is_primary,
                'current' => round($goal->currentAmount($invested), 2),
                'percent' => $goal->progressPercent($invested),
                'monthly_needed' => $this->monthlyNeeded($goal, $invested),
            ]),
            'invested' => round($invested, 2),
            'investments' => OpenFinanceInvestment::where('balance', '>', 0)
                ->orderByDesc('balance')
                ->get()
                ->map(fn (OpenFinanceInvestment $i) => [
                    'id' => $i->id,
                    'name' => $i->shortName(),
                    'type' => $i->subtype ?? $i->type,
                    'balance' => $i->balance,
                ]),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validateGoal($request);

        DB::transaction(function () use ($data) {
            // A primeira meta vira a principal (é a que aparece na Home).
            $goal = Goal::create([...$data, 'is_primary' => ! Goal::exists()]);

            if ($data['is_primary'] ?? false) {
                $this->makePrimary($goal);
            }
        });

        return back()->with('success', 'Meta criada.');
    }

    public function update(Request $request, Goal $goal): RedirectResponse
    {
        $data = $this->validateGoal($request);

        DB::transaction(function () use ($goal, $data) {
            $goal->update(collect($data)->except('is_primary')->all());

            if ($data['is_primary'] ?? false) {
                $this->makePrimary($goal);
            }
        });

        return back()->with('success', 'Meta atualizada.');
    }

    public function destroy(Goal $goal): RedirectResponse
    {
        $wasPrimary = $goal->is_primary;
        $goal->delete();

        if ($wasPrimary) {
            Goal::orderBy('id')->first()?->update(['is_primary' => true]);
        }

        return back()->with('success', 'Meta removida.');
    }

    public function primary(Goal $goal): RedirectResponse
    {
        DB::transaction(fn () => $this->makePrimary($goal));

        return back()->with('success', "\"{$goal->name}\" agora aparece na Home.");
    }

    private function makePrimary(Goal $goal): void
    {
        Goal::whereKeyNot($goal->id)->update(['is_primary' => false]);
        $goal->update(['is_primary' => true]);
    }

    // Quanto precisa guardar por mês, do mês que vem até o prazo, para bater a meta.
    private function monthlyNeeded(Goal $goal, float $invested): ?float
    {
        if (! $goal->deadline) {
            return null;
        }

        $missing = $goal->target_amount - $goal->currentAmount($invested);
        $months = max(1, (int) ceil(now()->startOfMonth()->diffInMonths($goal->deadline->copy()->startOfMonth())));

        return $missing > 0 ? round($missing / $months, 2) : 0.0;
    }

    private function validateGoal(Request $request): array
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'target_amount' => ['required', 'numeric', 'min:1'],
            'deadline' => ['nullable', 'date'],
            'tracking' => ['required', 'in:investments,manual'],
            'manual_amount' => ['nullable', 'numeric', 'min:0'],
            'is_primary' => ['boolean'],
        ]);

        $data['manual_amount'] = (float) ($data['manual_amount'] ?? 0);

        return $data;
    }
}
