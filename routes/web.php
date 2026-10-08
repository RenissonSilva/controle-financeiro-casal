<?php

use App\Http\Controllers\AccessController;
use App\Http\Controllers\CategorizationRuleController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ExpenseController;
use App\Http\Controllers\FixedExpenseController;
use App\Http\Controllers\GoalController;
use App\Http\Controllers\HistoryController;
use App\Http\Controllers\InviteController;
use App\Http\Controllers\OpenFinanceController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\SettingController;
use App\Http\Controllers\SettlementController;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;

// Redireciona raiz para o dashboard.
Route::redirect('/', '/dashboard');

if (app()->environment('local')) {
    Route::get('/_dev-login', function () {
        Auth::loginUsingId(1);
        return redirect('/dashboard');
    });
}

// Convite para vincular uma conta à conta principal (funciona logado ou não).
Route::get('/convite/{token}', [InviteController::class, 'show'])->name('invites.show');
Route::post('/convite/{token}', [InviteController::class, 'accept'])->middleware('auth')->name('invites.accept');
Route::get('/aguardando-vinculo', [InviteController::class, 'pending'])->middleware('auth')->name('access.pending');

// Conta principal edita tudo; conta vinculada vê tudo e só cria/edita/exclui nas áreas que o
// dono liberou (can:<área>.edit / can:<área>.delete — ver User::AREAS).
Route::middleware(['auth', 'verified', 'linked'])->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

    // Lançamentos
    Route::get('/expenses', [ExpenseController::class, 'index'])->name('expenses.index');
    Route::post('/expenses/export-pdf', [ExpenseController::class, 'exportPdf'])->name('expenses.exportPdf');

    Route::middleware('can:expenses.edit')->group(function () {
        Route::post('/expenses', [ExpenseController::class, 'store'])->name('expenses.store');
        Route::post('/expenses/batch', [ExpenseController::class, 'batchUpdate'])->name('expenses.batch');
        Route::post('/expenses/categorize', [ExpenseController::class, 'categorize'])->name('expenses.categorize');
        Route::put('/expenses/{expense}', [ExpenseController::class, 'update'])->name('expenses.update');
        Route::post('/expenses/{expense}/ignore', [ExpenseController::class, 'toggleIgnore'])->name('expenses.toggleIgnore');
    });
    Route::delete('/expenses/{expense}', [ExpenseController::class, 'destroy'])->middleware('can:expenses.delete')->name('expenses.destroy');

    // Acerto do casal (detalhes do card da Home)
    Route::get('/settlement', [SettlementController::class, 'index'])->name('settlement.index');

    // Categorias e regras (editadas em Configurações; os index só redirecionam)
    Route::get('/categories', [CategoryController::class, 'index'])->name('categories.index');
    Route::get('/categorization-rules', [CategorizationRuleController::class, 'index'])->name('categorizationRules.index');

    Route::middleware('can:settings.edit')->group(function () {
        Route::post('/categories', [CategoryController::class, 'store'])->name('categories.store');
        Route::put('/categories/{category}', [CategoryController::class, 'update'])->name('categories.update');
        Route::post('/categorization-rules', [CategorizationRuleController::class, 'store'])->name('categorizationRules.store');
        Route::put('/categorization-rules/{categorizationRule}', [CategorizationRuleController::class, 'update'])->name('categorizationRules.update');
        Route::post('/categorization-rules/apply', [CategorizationRuleController::class, 'apply'])->name('categorizationRules.apply');
    });

    Route::middleware('can:settings.delete')->group(function () {
        Route::delete('/categories/{category}', [CategoryController::class, 'destroy'])->name('categories.destroy');
        Route::delete('/categorization-rules/{categorizationRule}', [CategorizationRuleController::class, 'destroy'])->name('categorizationRules.destroy');
    });

    // Contas fixas
    Route::get('/fixed-expenses', [FixedExpenseController::class, 'index'])->name('fixedExpenses.index');
    Route::get('/fixed-expenses/{fixedExpense}/candidates', [FixedExpenseController::class, 'candidates'])->name('fixedExpenses.candidates');

    Route::middleware('can:fixed.edit')->group(function () {
        Route::post('/fixed-expenses', [FixedExpenseController::class, 'store'])->name('fixedExpenses.store');
        Route::put('/fixed-expenses/{fixedExpense}', [FixedExpenseController::class, 'update'])->name('fixedExpenses.update');
        Route::put('/fixed-expenses/{fixedExpense}/occurrence', [FixedExpenseController::class, 'updateOccurrence'])->name('fixedExpenses.occurrence.update');
        Route::delete('/fixed-expenses/occurrence/{occurrence}', [FixedExpenseController::class, 'destroyOccurrence'])->name('fixedExpenses.occurrence.destroy');
        Route::post('/fixed-expenses/{fixedExpense}/link', [FixedExpenseController::class, 'link'])->name('fixedExpenses.link');
        Route::post('/fixed-expenses/{fixedExpense}/unlink', [FixedExpenseController::class, 'unlink'])->name('fixedExpenses.unlink');
    });
    Route::delete('/fixed-expenses/{fixedExpense}', [FixedExpenseController::class, 'destroy'])->middleware('can:fixed.delete')->name('fixedExpenses.destroy');

    // Metas
    Route::get('/goals', [GoalController::class, 'index'])->name('goals.index');

    Route::middleware('can:goals.edit')->group(function () {
        Route::post('/goals', [GoalController::class, 'store'])->name('goals.store');
        Route::put('/goals/{goal}', [GoalController::class, 'update'])->name('goals.update');
        Route::post('/goals/{goal}/primary', [GoalController::class, 'primary'])->name('goals.primary');
    });
    Route::delete('/goals/{goal}', [GoalController::class, 'destroy'])->middleware('can:goals.delete')->name('goals.destroy');

    // Open Finance (Pluggy) — as conexões ficam em Configurações > Contas conectadas.
    // Sincronizar só traz os dados novos do banco: qualquer conta vinculada pode.
    Route::get('/open-finance', [OpenFinanceController::class, 'index'])->name('openFinance.index');
    Route::post('/open-finance/sync', [OpenFinanceController::class, 'sync'])->name('openFinance.sync');
    Route::get('/open-finance/items/{openFinanceItem}', [OpenFinanceController::class, 'show'])->name('openFinance.items.show');
    Route::post('/open-finance/items/{openFinanceItem}/sync', [OpenFinanceController::class, 'sync'])->name('openFinance.items.sync');

    Route::middleware('can:settings.edit')->group(function () {
        Route::post('/open-finance/connect-token', [OpenFinanceController::class, 'connectToken'])->name('openFinance.connectToken');
        Route::post('/open-finance/items', [OpenFinanceController::class, 'store'])->name('openFinance.items.store');
        Route::put('/open-finance/items/{openFinanceItem}', [OpenFinanceController::class, 'update'])->name('openFinance.items.update');
    });
    Route::delete('/open-finance/items/{openFinanceItem}', [OpenFinanceController::class, 'destroy'])->middleware('can:settings.delete')->name('openFinance.items.destroy');

    // Configurações
    Route::get('/settings', [SettingController::class, 'show'])->name('settings.show');
    Route::put('/settings', [SettingController::class, 'update'])->middleware('can:settings.edit')->name('settings.update');

    // Acesso compartilhado e histórico de mudanças: só a conta principal.
    Route::middleware('can:owner')->group(function () {
        Route::get('/history', [HistoryController::class, 'index'])->name('history.index');
        Route::post('/access/invites', [AccessController::class, 'invite'])->name('access.invites.store');
        Route::delete('/access/invites/{invite}', [AccessController::class, 'revokeInvite'])->name('access.invites.destroy');
        Route::put('/access/members/{member}', [AccessController::class, 'update'])->name('access.members.update');
        Route::delete('/access/members/{member}', [AccessController::class, 'destroy'])->name('access.members.destroy');
    });
});

// Perfil (Breeze): cada conta cuida do próprio, vinculada ou não.
Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';
