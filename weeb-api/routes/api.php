<?php

use App\Http\Controllers\Api\AllTransactionController;
use App\Http\Controllers\Api\AccountAllocationController;
use App\Http\Controllers\Api\Auth\GoogleAuthController;
use App\Http\Controllers\Api\Auth\PasswordAuthController;
use App\Http\Controllers\Api\BillController;
use App\Http\Controllers\Api\BudgetAlertController;
use App\Http\Controllers\Api\BudgetController;
use App\Http\Controllers\Api\BudgetPlannerController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\CoupleSavingsSettingController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\EmergencyFundController;
use App\Http\Controllers\Api\FinancialPeriodController;
use App\Http\Controllers\Api\ExpenseController;
use App\Http\Controllers\Api\ExpenseStatisticController;
use App\Http\Controllers\Api\FinancialAccountController;
use App\Http\Controllers\Api\HealthScoreController;
use App\Http\Controllers\Api\GoldSavingsMarketController;
use App\Http\Controllers\Api\IncomeController;
use App\Http\Controllers\Api\InsightController;
use App\Http\Controllers\Api\MonthlyReportController;
use App\Http\Controllers\Api\OnboardingController;
use App\Http\Controllers\Api\PaydaySimulationController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\RecurringTransactionController;
use App\Http\Controllers\Api\SavingGoalController;
use App\Http\Controllers\Api\UserManagementController;
use App\Http\Controllers\Api\WishlistController;
use App\Http\Middleware\UseDefaultUser;
use Illuminate\Support\Facades\Route;

Route::get('/auth/google/redirect', [GoogleAuthController::class, 'redirect'])->name('auth.google.redirect');
Route::get('/auth/google/callback', [GoogleAuthController::class, 'callback'])->name('auth.google.callback');
Route::post('/auth/login', [PasswordAuthController::class, 'login'])->name('auth.login');
Route::post('/auth/register', [PasswordAuthController::class, 'register'])->name('auth.register');

Route::middleware(UseDefaultUser::class)->group(function () {
    Route::get('/auth/me', [GoogleAuthController::class, 'me'])->name('auth.me');
    Route::post('/auth/logout', [GoogleAuthController::class, 'logout'])->name('auth.logout');

    Route::get('/profile', [ProfileController::class, 'show'])->name('profile.show');
    Route::put('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.patch');

    Route::get('/onboarding', [OnboardingController::class, 'show'])->name('onboarding.show');
    Route::post('/onboarding', [OnboardingController::class, 'store'])->name('onboarding.store');

    Route::get('/dashboard', DashboardController::class)->name('dashboard');
    Route::get('/dashboard/summary', DashboardController::class)->name('dashboard.summary');
    Route::get('/dashboard/health-score', [DashboardController::class, 'healthScore'])->name('dashboard.health-score');
    Route::get('/dashboard/insights', [DashboardController::class, 'insights'])->name('dashboard.insights');
    Route::get('/dashboard/cashflow-preview', [DashboardController::class, 'cashflowPreview'])->name('dashboard.cashflow-preview');
    Route::get('/payday-simulation', PaydaySimulationController::class)->name('payday-simulation');
    Route::get('/health-score', HealthScoreController::class)->name('health-score');
    Route::get('/insights', [InsightController::class, 'index'])->name('insights.index');
    Route::get('/reports/monthly', [MonthlyReportController::class, 'index'])->name('reports.monthly.index');
    Route::get('/reports/monthly/current', [MonthlyReportController::class, 'show'])->name('reports.monthly.show');
    Route::get('/reports/category-breakdown', [DashboardController::class, 'categoryBreakdown'])->name('reports.category-breakdown');
    Route::get('/statistics/expenses/categories', [ExpenseStatisticController::class, 'byCategory'])->name('statistics.expenses.categories');
    Route::get('/budget-alerts', BudgetAlertController::class)->name('budget-alerts');
    Route::get('/budget-planner', BudgetPlannerController::class)->name('budget-planner');
    Route::put('/budget-planner/allocations', [BudgetPlannerController::class, 'updateAllocations'])->name('budget-planner.allocations.update');
    Route::get('/couple-savings/setting', [CoupleSavingsSettingController::class, 'show'])->name('couple-savings.setting.show');
    Route::put('/couple-savings/setting', [CoupleSavingsSettingController::class, 'update'])->name('couple-savings.setting.update');
    Route::get('/gold-savings/market', GoldSavingsMarketController::class)->name('gold-savings.market');

    Route::apiResource('categories', CategoryController::class);
    Route::apiResource('users', UserManagementController::class);
    Route::apiResource('accounts', FinancialAccountController::class);
    Route::post('/account-allocations', [AccountAllocationController::class, 'store'])->name('account-allocations.store');
    Route::apiResource('periods', FinancialPeriodController::class)->parameters(['periods' => 'period']);
    Route::apiResource('transactions', AllTransactionController::class);
    Route::apiResource('incomes', IncomeController::class)->parameters(['incomes' => 'transaction']);
    Route::apiResource('expenses', ExpenseController::class)->parameters(['expenses' => 'transaction']);
    Route::apiResource('budgets', BudgetController::class);
    Route::apiResource('saving-goals', SavingGoalController::class)->parameters(['saving-goals' => 'savingGoal']);
    Route::apiResource('emergency-funds', EmergencyFundController::class)->parameters(['emergency-funds' => 'savingGoal']);
    Route::apiResource('emergency-fund', EmergencyFundController::class)->parameters(['emergency-fund' => 'savingGoal'])->except(['show']);
    Route::apiResource('bills', BillController::class);
    Route::apiResource('recurring-bills', BillController::class)->parameters(['recurring-bills' => 'bill']);
    Route::apiResource('recurring-transactions', RecurringTransactionController::class)->parameters(['recurring-transactions' => 'recurringTransaction']);
    Route::apiResource('wishlists', WishlistController::class);
    Route::apiResource('wishlist', WishlistController::class)->parameters(['wishlist' => 'wishlist'])->except(['show']);
});
