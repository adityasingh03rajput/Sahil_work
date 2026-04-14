import { Suspense, lazy, useEffect } from 'react';
import React from 'react';
import { createBrowserRouter, createHashRouter, RouterProvider, Outlet, Navigate, useLocation } from 'react-router';
import { Toaster } from './components/ui/sonner';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { TourProvider } from './contexts/TourContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { DisplayProvider } from './contexts/DisplayContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { OfflineBanner } from './components/OfflineBanner';
import { useIsNative } from './hooks/useIsNative';
import { AuthPage } from './pages/AuthPage';
import { AppLayout } from './components/AppLayout';
import { prefetchRoutesOnIdle } from './hooks/usePrefetch';
import { EmployeeLoginPage } from './pages/EmployeeLoginPage';
import { EmployeeAttendancePage } from './pages/EmployeeAttendancePage';
import { useCurrentProfile } from './hooks/useCurrentProfile';

// Lazy-load all heavy pages
const WelcomePageWrapper        = lazy(() => import('./pages/WelcomePageWrapper').then(m => ({ default: m.WelcomePageWrapper })));
const ProfilesPageWrapper       = lazy(() => import('./pages/ProfilesPageWrapper').then(m => ({ default: m.ProfilesPageWrapper })));
const DashboardPageWrapper      = lazy(() => import('./pages/DashboardPageWrapper').then(m => ({ default: m.DashboardPageWrapper })));
const DocumentsPageWrapper      = lazy(() => import('./pages/DocumentsPageWrapper').then(m => ({ default: m.DocumentsPageWrapper })));
const MobileDocumentsPageWrapper = lazy(() => import('./pages/MobileDocumentsPageWrapper').then(m => ({ default: m.MobileDocumentsPageWrapper })));
const MobileLedgerPageWrapper = lazy(() => import('./pages/MobileLedgerPageWrapper').then(m => ({ default: m.MobileLedgerPageWrapper })));
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
const EmployeesPageWrapper      = lazy(() => import('./pages/EmployeesPageWrapper').then(m => ({ default: m.EmployeesPageWrapper })));
const AttendancePageWrapper     = lazy(() => import('./pages/AttendancePageWrapper').then(m => ({ default: m.AttendancePageWrapper })));

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

/** Conditional Documents Page - uses mobile version on native, desktop version on web */
function ConditionalDocumentsPage() {
  const isNative = useIsNative();
  return isNative ? wrap(MobileDocumentsPageWrapper) : wrap(DocumentsPageWrapper);
}

/** Conditional Ledger Page - uses mobile version on native, desktop version on web */
function ConditionalLedgerPage() {
  const isNative = useIsNative();
  return isNative ? wrap(MobileLedgerPageWrapper) : wrap(PartyLedgerPageWrapper);
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
  const { isEmployee, sessionKey, profiles, loading } = useAuth();
  const { profileId } = useCurrentProfile();
  const { pathname } = useLocation();

  useEffect(() => {
    if (!isEmployee) {
      prefetchRoutesOnIdle(['/dashboard', '/documents', '/items', '/customers', '/suppliers']);
    }
  }, [isEmployee]);

  if (isEmployee) {
    return <Navigate to="/employee/attendance" replace />;
  }

  // If user has no profiles, they MUST stay on /profiles or /welcome
  // We check !loading to ensure we have the profiles list from AuthContext
  const hasNoProfiles = !isEmployee && Array.isArray(profiles) && profiles.length === 0;
  if (!loading && hasNoProfiles && pathname !== '/profiles') {
    return <Navigate to="/profiles" replace />;
  }

  return (
    // key=sessionKey-profileId forces full remount of AppLayout + all child pages on sign-in/out AND profile switch
    // This perfectly isolates profiles like Instagram account switching
    <AppLayout key={`${sessionKey}-${profileId || 'unselected'}`}>
      <Outlet />
    </AppLayout>
  );
}

const createRouter = window.location.protocol === 'file:' ? createHashRouter : createBrowserRouter;

function buildRouter() {
  return createRouter([
    { path: "/", element: <AuthPage /> },
    { path: "/employee/login",      element: <EmployeeLoginPage /> },
    { path: "/employee/attendance", element: <EmployeeAttendancePage /> },
    {
      element: <LayoutRoute />,
      children: [
        { path: "/profiles",            element: wrap(ProfilesPageWrapper) },
        { path: "/welcome",             element: <Navigate to="/profiles" replace /> },
        { path: "/dashboard",           element: wrap(DashboardPageWrapper) },
        { path: "/documents",           element: <ConditionalDocumentsPage /> },
        { path: "/documents/create",    element: wrap(CreateDocumentPageWrapper) },
        { path: "/documents/edit/:id",  element: wrap(CreateDocumentPageWrapper) },
        { path: "/customers",           element: wrap(CustomersPageWrapper) },
        { path: "/suppliers",           element: wrap(SuppliersPageWrapper) },
        { path: "/items",               element: wrap(ItemsPageWrapper) },
        { path: "/analytics",           element: wrap(AnalyticsPageWrapper) },
        { path: "/reports/gst",         element: wrap(GstReportsPage) },
        { path: "/ledger",              element: <ConditionalLedgerPage /> },
        { path: "/subscription",        element: wrap(SubscriptionPageWrapper) },
        { path: "/bank-accounts",       element: wrap(BankAccountsPageWrapper) },
        { path: "/pos",                 element: wrap(PosPageWrapper) },
        { path: "/extra-expenses",      element: wrap(ExtraExpensesPageWrapper) },
        { path: "/vyapar-khata",        element: wrap(VyaparKhataPageWrapper) },
        { path: "/vyapar-khata-new",    element: wrap(VyaparKhataPageNewWrapper) },
        { path: "/employees",           element: wrap(EmployeesPageWrapper) },
        { path: "/attendance",          element: wrap(AttendancePageWrapper) },
      ],
    },
  ]);
}

// Singleton router — stable across re-renders, created once per app lifecycle
let _router: ReturnType<typeof buildRouter> | null = null;

function AppInner() {
  const isNative = useIsNative();
  // Create router once and keep it stable — never recreate on re-render
  const routerRef = React.useRef<ReturnType<typeof buildRouter> | null>(null);
  if (!routerRef.current) {
    // Reuse module-level singleton if available (survives HMR in prod)
    // but always create fresh if null (first mount or after full reload)
    if (!_router) _router = buildRouter();
    routerRef.current = _router;
  }
  useEffect(() => {
    if (isNative) {
      document.documentElement.classList.add('native-app');
    } else {
      document.documentElement.classList.remove('native-app');
    }
  }, [isNative]);

  return (
    <>
      {!isNative && <OfflineBanner />}
      <RouterProvider router={routerRef.current} />
      <Toaster />
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <TourProvider>
          <ThemeProvider>
            <DisplayProvider>
              <AppInner />
            </DisplayProvider>
          </ThemeProvider>
        </TourProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
