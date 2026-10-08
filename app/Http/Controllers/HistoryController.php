<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

// Histórico de mudanças (só a conta principal vê): quem mudou o quê, mais recentes primeiro.
class HistoryController extends Controller
{
    public const PER_PAGE = 50;

    public function index(Request $request): Response
    {
        $filters = $request->validate([
            'area' => ['nullable', Rule::in(array_keys(ActivityLog::AREAS))],
            'user' => ['nullable', 'integer'],
        ]);

        $page = ActivityLog::query()
            ->with('user:id,role')
            ->when($filters['area'] ?? null, fn ($query, string $area) => $query->where('area', $area))
            ->when($filters['user'] ?? null, fn ($query, int $user) => $query->where('user_id', $user))
            ->orderByDesc('id')
            ->paginate(self::PER_PAGE)
            ->withQueryString();

        return Inertia::render('History', [
            'entries' => collect($page->items())->map(fn (ActivityLog $log) => [
                'id' => $log->id,
                'batch' => $log->batch,
                'user_id' => $log->user_id,
                'user_name' => $log->user_name,
                // Cor do avatar: conta principal com a cor da pessoa 1, as vinculadas com a da pessoa 2.
                'is_owner' => (bool) $log->user?->isOwner(),
                'area' => $log->area,
                'action' => $log->action,
                'description' => $log->description,
                'subject_label' => $log->subject_label,
                'changes' => $log->changes ?? [],
                'created_at' => $log->created_at->toIso8601String(),
            ]),
            'pagination' => [
                'current' => $page->currentPage(),
                'last' => $page->lastPage(),
                'total' => $page->total(),
                'previous' => $page->previousPageUrl(),
                'next' => $page->nextPageUrl(),
            ],
            'filters' => [
                'area' => $filters['area'] ?? null,
                'user' => isset($filters['user']) ? (int) $filters['user'] : null,
            ],
            'areas' => collect(ActivityLog::AREAS)->map(fn (string $label, string $key) => ['value' => $key, 'label' => $label])->values(),
            'people' => User::whereNotNull('role')->orderBy('id')->get(['id', 'name', 'role'])->map(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'is_owner' => $user->isOwner(),
            ]),
        ]);
    }
}
