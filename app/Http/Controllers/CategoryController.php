<?php

namespace App\Http\Controllers;

use App\Models\Category;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CategoryController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Categories', [
            'categories' => Category::withCount('expenses')
                ->orderBy('name')
                ->get()
                ->map(fn (Category $category) => [
                    'id'                => $category->id,
                    'name'              => $category->name,
                    'color'             => $category->color,
                    'default_ownership' => $category->default_ownership,
                    'expenses_count'    => $category->expenses_count,
                ]),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validateCategory($request);

        Category::create($data);

        return back()->with('success', 'Categoria criada com sucesso.');
    }

    public function update(Request $request, Category $category): RedirectResponse
    {
        $data = $this->validateCategory($request);

        $category->update($data);

        return back()->with('success', 'Categoria atualizada com sucesso.');
    }

    public function destroy(Category $category): RedirectResponse
    {
        $category->delete();

        return back()->with('success', 'Categoria removida.');
    }

    private function validateCategory(Request $request): array
    {
        return $request->validate([
            'name'              => ['required', 'string', 'max:255'],
            'color'             => ['required', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'default_ownership' => ['required', 'in:payer1,payer2,both'],
        ]);
    }
}
