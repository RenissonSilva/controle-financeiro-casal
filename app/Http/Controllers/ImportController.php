<?php

namespace App\Http\Controllers;

use App\Imports\NubankImport;
use App\Models\Setting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Maatwebsite\Excel\Facades\Excel;

class ImportController extends Controller
{
    public function show(): Response
    {
        $settings = Setting::current();

        return Inertia::render('Import', [
            'payer1Name' => $settings->payer1_name,
            'payer2Name' => $settings->payer2_name,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'file'   => ['required', 'file', 'mimes:csv,txt', 'max:5120'],
            'source' => ['required', 'in:payer1,payer2'],
        ]);

        $import = new NubankImport($request->source);
        Excel::import($import, $request->file('file'));

        $count = $import->getImportedCount();

        // Redireciona para a aba correta na tela de despesas.
        return redirect()->route('expenses.index', ['tab' => $request->source])->with(
            'success',
            $count > 0
                ? "{$count} despesa(s) importada(s). A categorização por IA está sendo processada em background."
                : "Nenhuma despesa nova encontrada no arquivo (duplicatas ignoradas)."
        );
    }
}
