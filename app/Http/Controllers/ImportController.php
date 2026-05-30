<?php

namespace App\Http\Controllers;

use App\Imports\NubankImport;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Maatwebsite\Excel\Facades\Excel;

class ImportController extends Controller
{
    public function show(): Response
    {
        return Inertia::render('Import');
    }

    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:csv,txt', 'max:5120'],
        ]);

        $import = new NubankImport();
        Excel::import($import, $request->file('file'));

        $count = $import->getImportedCount();

        return redirect()->route('expenses.index')->with(
            'success',
            $count > 0
                ? "{$count} despesa(s) importada(s). A categorização por IA está sendo processada em background."
                : "Nenhuma despesa nova encontrada no arquivo (duplicatas ignoradas)."
        );
    }
}
