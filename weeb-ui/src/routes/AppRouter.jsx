import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Outlet, Routes, Route, useLocation } from 'react-router-dom';
import { PageLoader } from '../components/feedback/LoadingSkeleton';
import PageTitle from '../components/system/PageTitle';

const DashboardLayout = lazy(() => import('../layouts/DashboardLayout'));
const DashboardPage = lazy(() => import('../pages/DashboardPage'));
const OnboardingPage = lazy(() => import('../pages/OnboardingPage'));
const TransactionsPage = lazy(() => import('../pages/TransactionsPage'));
const AccountsPage = lazy(() => import('../pages/AccountsPage'));
const CategoriesPage = lazy(() => import('../pages/CategoriesPage'));
const BudgetsPage = lazy(() => import('../pages/BudgetsPage'));
const BudgetPlannerPage = lazy(() => import('../pages/BudgetPlannerPage'));
const PeriodsPage = lazy(() => import('../pages/PeriodsPage'));
const SavingsPage = lazy(() => import('../pages/SavingsPage'));
const CoupleSavingsPage = lazy(() => import('../pages/CoupleSavingsPage'));
const EmergencyFundPage = lazy(() => import('../pages/EmergencyFundPage'));
const BillsPage = lazy(() => import('../pages/BillsPage'));
const RecurringTransactionsPage = lazy(() => import('../pages/RecurringTransactionsPage'));
const ReportsPage = lazy(() => import('../pages/ReportsPage'));
const InsightsPage = lazy(() => import('../pages/InsightsPage'));
const WishlistPage = lazy(() => import('../pages/WishlistPage'));
const ProfilePage = lazy(() => import('../pages/ProfilePage'));
const LoginPage = lazy(() => import('../pages/LoginPage'));
const GoogleCallbackPage = lazy(() => import('../pages/GoogleCallbackPage'));
const NotFoundPage = lazy(() => import('../pages/NotFoundPage'));

function RequireAuth() {
  const location = useLocation();
  const token = localStorage.getItem('weeb_auth_token');

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
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
          <Route path="/auth/google/callback" element={<GoogleCallbackPage />} />
          <Route element={<RequireAuth />}>
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/onboarding" element={<OnboardingPage />} />
              <Route path="/transactions" element={<TransactionsPage />} />
              <Route path="/transactions/income" element={<TransactionsPage type="income" />} />
              <Route path="/transactions/expense" element={<TransactionsPage type="expense" />} />
              <Route path="/accounts" element={<AccountsPage />} />
              <Route path="/categories" element={<CategoriesPage />} />
              <Route path="/budgets" element={<BudgetsPage />} />
              <Route path="/budget-planner" element={<BudgetPlannerPage />} />
              <Route path="/periods" element={<PeriodsPage />} />
              <Route path="/savings" element={<SavingsPage />} />
              <Route path="/couple-savings" element={<CoupleSavingsPage />} />
              <Route path="/emergency-fund" element={<EmergencyFundPage />} />
              <Route path="/bills" element={<BillsPage />} />
              <Route path="/recurring-transactions" element={<RecurringTransactionsPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/insights" element={<InsightsPage />} />
              <Route path="/wishlist" element={<WishlistPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
