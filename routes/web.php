<?php

use App\Http\Controllers\CategorizationRuleController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ExpenseController;
use App\Http\Controllers\FixedExpenseController;
use App\Http\Controllers\ImportController;
use App\Http\Controllers\OpenFinanceController;
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

    // Categorias
    Route::get('/categories', [CategoryController::class, 'index'])->name('categories.index');
    Route::post('/categories', [CategoryController::class, 'store'])->name('categories.store');
    Route::put('/categories/{category}', [CategoryController::class, 'update'])->name('categories.update');
    Route::delete('/categories/{category}', [CategoryController::class, 'destroy'])->name('categories.destroy');

    // Regras de categorização automática
    Route::get('/categorization-rules', [CategorizationRuleController::class, 'index'])->name('categorizationRules.index');
    Route::post('/categorization-rules', [CategorizationRuleController::class, 'store'])->name('categorizationRules.store');
    Route::put('/categorization-rules/{categorizationRule}', [CategorizationRuleController::class, 'update'])->name('categorizationRules.update');
    Route::delete('/categorization-rules/{categorizationRule}', [CategorizationRuleController::class, 'destroy'])->name('categorizationRules.destroy');
    Route::post('/categorization-rules/apply', [CategorizationRuleController::class, 'apply'])->name('categorizationRules.apply');

    // Despesas fixas
    Route::get('/fixed-expenses', [FixedExpenseController::class, 'index'])->name('fixedExpenses.index');
    Route::post('/fixed-expenses', [FixedExpenseController::class, 'store'])->name('fixedExpenses.store');
    Route::put('/fixed-expenses/{fixedExpense}', [FixedExpenseController::class, 'update'])->name('fixedExpenses.update');
    Route::delete('/fixed-expenses/{fixedExpense}', [FixedExpenseController::class, 'destroy'])->name('fixedExpenses.destroy');
    Route::put('/fixed-expenses/{fixedExpense}/occurrence', [FixedExpenseController::class, 'updateOccurrence'])->name('fixedExpenses.occurrence.update');
    Route::delete('/fixed-expenses/occurrence/{occurrence}', [FixedExpenseController::class, 'destroyOccurrence'])->name('fixedExpenses.occurrence.destroy');

    // Open Finance (Pluggy)
    Route::get('/open-finance', [OpenFinanceController::class, 'index'])->name('openFinance.index');
    Route::post('/open-finance/connect-token', [OpenFinanceController::class, 'connectToken'])->name('openFinance.connectToken');
    Route::post('/open-finance/items', [OpenFinanceController::class, 'store'])->name('openFinance.items.store');
    Route::get('/open-finance/items/{openFinanceItem}', [OpenFinanceController::class, 'show'])->name('openFinance.items.show');
    Route::put('/open-finance/items/{openFinanceItem}', [OpenFinanceController::class, 'update'])->name('openFinance.items.update');
    Route::post('/open-finance/items/{openFinanceItem}/sync', [OpenFinanceController::class, 'sync'])->name('openFinance.items.sync');
    Route::delete('/open-finance/items/{openFinanceItem}', [OpenFinanceController::class, 'destroy'])->name('openFinance.items.destroy');

    // Configurações
    Route::get('/settings', [SettingController::class, 'show'])->name('settings.show');
    Route::put('/settings', [SettingController::class, 'update'])->name('settings.update');

    // Perfil (Breeze)
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';
