import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Outlet, Routes, Route, useLocation } from 'react-router-dom';
import { PageLoader } from '../components/feedback/LoadingSkeleton';
import PageTitle from '../components/system/PageTitle';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { lazyWithRetry } from '../lib/lazyWithRetry';

const DashboardLayout = lazy(lazyWithRetry(() => import('../layouts/DashboardLayout'), 'DashboardLayout'));
const DashboardPage = lazy(lazyWithRetry(() => import('../pages/DashboardPage'), 'DashboardPage'));
const OnboardingPage = lazy(lazyWithRetry(() => import('../pages/OnboardingPage'), 'OnboardingPage'));
const TransactionsPage = lazy(lazyWithRetry(() => import('../pages/TransactionsPage'), 'TransactionsPage'));
const AccountsPage = lazy(lazyWithRetry(() => import('../pages/AccountsPage'), 'AccountsPage'));
const CategoriesPage = lazy(lazyWithRetry(() => import('../pages/CategoriesPage'), 'CategoriesPage'));
const BudgetsPage = lazy(lazyWithRetry(() => import('../pages/BudgetsPage'), 'BudgetsPage'));
const BudgetPlannerPage = lazy(lazyWithRetry(() => import('../pages/BudgetPlannerPage'), 'BudgetPlannerPage'));
const PeriodsPage = lazy(lazyWithRetry(() => import('../pages/PeriodsPage'), 'PeriodsPage'));
const SavingsPage = lazy(lazyWithRetry(() => import('../pages/SavingsPage'), 'SavingsPage'));
const CoupleSavingsPage = lazy(lazyWithRetry(() => import('../pages/CoupleSavingsPage'), 'CoupleSavingsPage'));
const EmergencyFundPage = lazy(lazyWithRetry(() => import('../pages/EmergencyFundPage'), 'EmergencyFundPage'));
const BillsPage = lazy(lazyWithRetry(() => import('../pages/BillsPage'), 'BillsPage'));
const RecurringTransactionsPage = lazy(lazyWithRetry(() => import('../pages/RecurringTransactionsPage'), 'RecurringTransactionsPage'));
const ReportsPage = lazy(lazyWithRetry(() => import('../pages/ReportsPage'), 'ReportsPage'));
const InsightsPage = lazy(lazyWithRetry(() => import('../pages/InsightsPage'), 'InsightsPage'));
const WishlistPage = lazy(lazyWithRetry(() => import('../pages/WishlistPage'), 'WishlistPage'));
const ProfilePage = lazy(lazyWithRetry(() => import('../pages/ProfilePage'), 'ProfilePage'));
const UsersPage = lazy(lazyWithRetry(() => import('../pages/UsersPage'), 'UsersPage'));
const LoginPage = lazy(lazyWithRetry(() => import('../pages/LoginPage'), 'LoginPage'));
const RegisterPage = lazy(lazyWithRetry(() => import('../pages/RegisterPage'), 'RegisterPage'));
const GoogleCallbackPage = lazy(lazyWithRetry(() => import('../pages/GoogleCallbackPage'), 'GoogleCallbackPage'));
const NotFoundPage = lazy(lazyWithRetry(() => import('../pages/NotFoundPage'), 'NotFoundPage'));

function RequireAuth() {
  const location = useLocation();
  const token = localStorage.getItem('weeb_auth_token');

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}

function RequireOnboarding() {
  const { user, isLoading } = useCurrentUser();
  const location = useLocation();

  if (isLoading) {
    return <div className="min-h-screen bg-bg-base p-4 md:p-8"><PageLoader /></div>;
  }

  if (user && !user.profile?.onboarding_completed_at && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
}

function RequireCoupleMode() {
  const { user, isLoading } = useCurrentUser();

  if (isLoading) {
    return <div className="min-h-screen bg-bg-base p-4 md:p-8"><PageLoader /></div>;
  }

  if ((user?.profile?.account_mode || 'couple') === 'personal') {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

function HomeRedirect() {
  return <Navigate to={localStorage.getItem('weeb_auth_token') ? '/dashboard' : '/login'} replace />;
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <PageTitle />
      <Suspense fallback={<div className="min-h-screen bg-bg-base p-4 md:p-8"><PageLoader /></div>}>
        <Routes>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/auth/google/callback" element={<GoogleCallbackPage />} />
          <Route element={<RequireAuth />}>
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route element={<RequireOnboarding />}>
              <Route element={<DashboardLayout />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/transactions" element={<TransactionsPage />} />
                <Route path="/transactions/income" element={<TransactionsPage type="income" />} />
                <Route path="/transactions/expense" element={<TransactionsPage type="expense" />} />
                <Route path="/accounts" element={<AccountsPage />} />
                <Route path="/categories" element={<CategoriesPage />} />
                <Route path="/budgets" element={<BudgetsPage />} />
                <Route path="/budget-planner" element={<BudgetPlannerPage />} />
                <Route path="/periods" element={<PeriodsPage />} />
                <Route path="/savings" element={<SavingsPage />} />
                <Route element={<RequireCoupleMode />}>
                  <Route path="/couple-savings" element={<CoupleSavingsPage />} />
                </Route>
                <Route path="/emergency-fund" element={<EmergencyFundPage />} />
                <Route path="/bills" element={<BillsPage />} />
                <Route path="/recurring-transactions" element={<RecurringTransactionsPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/insights" element={<InsightsPage />} />
                <Route path="/wishlist" element={<WishlistPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/users" element={<UsersPage />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
