import { Suspense, lazy, useEffect } from 'react';
import React from 'react';
import { createBrowserRouter, RouterProvider, Outlet } from 'react-router';
import { Toaster } from './components/ui/sonner';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { OfflineBanner } from './components/OfflineBanner';
import { useIsNative } from './hooks/useIsNative';
import { AuthPage } from './pages/AuthPage';
import { AppLayout } from './components/AppLayout';
import { prefetchRoutesOnIdle } from './hooks/usePrefetch';

// Lazy-load all heavy pages
const WelcomePageWrapper        = lazy(() => import('./pages/WelcomePageWrapper').then(m => ({ default: m.WelcomePageWrapper })));
const ProfilesPageWrapper       = lazy(() => import('./pages/ProfilesPageWrapper').then(m => ({ default: m.ProfilesPageWrapper })));
const DashboardPageWrapper      = lazy(() => import('./pages/DashboardPageWrapper').then(m => ({ default: m.DashboardPageWrapper })));
const DocumentsPageWrapper      = lazy(() => import('./pages/DocumentsPageWrapper').then(m => ({ default: m.DocumentsPageWrapper })));
const CreateDocumentPageWrapper = lazy(() => import('./pages/CreateDocumentPageWrapper').then(m => ({ default: m.CreateDocumentPageWrapper })));
const CustomersPageWrapper      = lazy(() => import('./pages/CustomersPageWrapper').then(m => ({ default: m.CustomersPageWrapper })));
const SuppliersPageWrapper      = lazy(() => import('./pages/SuppliersPageWrapper').then(m => ({ default: m.SuppliersPageWrapper })));
const ItemsPageWrapper          = lazy(() => import('./pages/ItemsPageWrapper').then(m => ({ default: m.ItemsPageWrapper })));
const AnalyticsPageWrapper      = lazy(() => import('./pages/AnalyticsPageWrapper').then(m => ({ default: m.AnalyticsPageWrapper })));
const SubscriptionPageWrapper   = lazy(() => import('./pages/SubscriptionPageWrapper').then(m => ({ default: m.SubscriptionPageWrapper })));
const GstReportsPage            = lazy(() => import('./pages/GstReportsPage').then(m => ({ default: m.GstReportsPage })));
const PartyLedgerPageWrapper    = lazy(() => import('./pages/PartyLedgerPageWrapper').then(m => ({ default: m.PartyLedgerPageWrapper })));
const BankAccountsPageWrapper   = lazy(() => import('./pages/BankAccountsPageWrapper').then(m => ({ default: m.BankAccountsPageWrapper })));
const PosPageWrapper            = lazy(() => import('./pages/PosPageWrapper').then(m => ({ default: m.PosPageWrapper })));
const ExtraExpensesPageWrapper  = lazy(() => import('./pages/ExtraExpensesPageWrapper').then(m => ({ default: m.ExtraExpensesPageWrapper })));
const VyaparKhataPageWrapper    = lazy(() => import('./pages/VyaparKhataPageWrapper').then(m => ({ default: m.VyaparKhataPageWrapper })));
const VyaparKhataPageNewWrapper = lazy(() => import('./pages/VyaparKhataPageNewWrapper').then(m => ({ default: m.VyaparKhataPageNewWrapper })));

/** Skeleton shown while a lazy page chunk is loading */
function PageSkeleton() {
  return (
    <div className="p-6 space-y-4 animate-pulse">
      <div className="h-8 w-48 rounded-lg bg-muted" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1,2,3].map(i => <div key={i} className="h-24 rounded-xl bg-muted" />)}
      </div>
      <div className="h-64 rounded-xl bg-muted" />
      <div className="space-y-2">
        {[1,2,3,4].map(i => <div key={i} className="h-12 rounded-lg bg-muted" />)}
      </div>
    </div>
  );
}

function wrap(Component: React.ComponentType) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageSkeleton />}>
        <Component />
      </Suspense>
    </ErrorBoundary>
  );
}

/** Persistent layout — never unmounts during navigation, preloads top routes on idle */
function LayoutRoute() {
  useEffect(() => {
    prefetchRoutesOnIdle(['/dashboard', '/documents', '/items', '/customers', '/suppliers']);
  }, []);

  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}

const router = createBrowserRouter([
  { path: "/", element: <AuthPage /> },
  {
    element: <LayoutRoute />,
    children: [
      { path: "/profiles",            element: wrap(ProfilesPageWrapper) },
      { path: "/welcome",             element: wrap(WelcomePageWrapper) },
      { path: "/dashboard",           element: wrap(DashboardPageWrapper) },
      { path: "/documents",           element: wrap(DocumentsPageWrapper) },
      { path: "/documents/create",    element: wrap(CreateDocumentPageWrapper) },
      { path: "/documents/edit/:id",  element: wrap(CreateDocumentPageWrapper) },
      { path: "/customers",           element: wrap(CustomersPageWrapper) },
      { path: "/suppliers",           element: wrap(SuppliersPageWrapper) },
      { path: "/items",               element: wrap(ItemsPageWrapper) },
      { path: "/analytics",           element: wrap(AnalyticsPageWrapper) },
      { path: "/reports/gst",         element: wrap(GstReportsPage) },
      { path: "/ledger",              element: wrap(PartyLedgerPageWrapper) },
      { path: "/subscription",        element: wrap(SubscriptionPageWrapper) },
      { path: "/bank-accounts",       element: wrap(BankAccountsPageWrapper) },
      { path: "/pos",                 element: wrap(PosPageWrapper) },
      { path: "/extra-expenses",      element: wrap(ExtraExpensesPageWrapper) },
      { path: "/vyapar-khata",        element: wrap(VyaparKhataPageWrapper) },
      { path: "/vyapar-khata-new",    element: wrap(VyaparKhataPageNewWrapper) },
    ],
  },
]);

function AppInner() {
  const isNative = useIsNative();
  return (
    <>
      {!isNative && <OfflineBanner />}
      <RouterProvider router={router} />
      <Toaster />
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ThemeProvider>
          <AppInner />
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
