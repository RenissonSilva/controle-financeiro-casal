<?php

use App\Http\Controllers\CategorizationRuleController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ExpenseController;
use App\Http\Controllers\ImportController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\SettingController;
use Illuminate\Support\Facades\Route;

// Redireciona raiz para o dashboard.
Route::redirect('/', '/dashboard');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

    // Despesas
    Route::get('/expenses', [ExpenseController::class, 'index'])->name('expenses.index');
    Route::post('/expenses', [ExpenseController::class, 'store'])->name('expenses.store');
    Route::post('/expenses/batch', [ExpenseController::class, 'batchUpdate'])->name('expenses.batch');
    Route::delete('/expenses/{expense}', [ExpenseController::class, 'destroy'])->name('expenses.destroy');
    Route::delete('/expenses-month/{month}/{source}', [ExpenseController::class, 'destroyByMonth'])->name('expenses.destroyByMonth');
    Route::post('/expenses/export-pdf', [ExpenseController::class, 'exportPdf'])->name('expenses.exportPdf');
    Route::post('/expenses/categorize', [ExpenseController::class, 'categorize'])->name('expenses.categorize');

    // Importação
    Route::get('/import', [ImportController::class, 'show'])->name('import.show');
    Route::post('/import', [ImportController::class, 'store'])->name('import.store');

    // Regras de categorização automática
    Route::get('/categorization-rules', [CategorizationRuleController::class, 'index'])->name('categorizationRules.index');
    Route::post('/categorization-rules', [CategorizationRuleController::class, 'store'])->name('categorizationRules.store');
    Route::put('/categorization-rules/{categorizationRule}', [CategorizationRuleController::class, 'update'])->name('categorizationRules.update');
    Route::delete('/categorization-rules/{categorizationRule}', [CategorizationRuleController::class, 'destroy'])->name('categorizationRules.destroy');
    Route::post('/categorization-rules/apply', [CategorizationRuleController::class, 'apply'])->name('categorizationRules.apply');

    // Configurações
    Route::get('/settings', [SettingController::class, 'show'])->name('settings.show');
    Route::put('/settings', [SettingController::class, 'update'])->name('settings.update');

    // Perfil (Breeze)
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__ . '/auth.php';
