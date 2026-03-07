import { createBrowserRouter, RouterProvider } from 'react-router';
import { Toaster } from './components/ui/sonner';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthPage } from './pages/AuthPage';
import { WelcomePageWrapper } from './pages/WelcomePageWrapper';
import { ProfilesPageWrapper } from './pages/ProfilesPageWrapper';
import { DashboardPageWrapper } from './pages/DashboardPageWrapper';
import { DocumentsPageWrapper } from './pages/DocumentsPageWrapper';
import { CreateDocumentPageWrapper } from './pages/CreateDocumentPageWrapper';
import { CustomersPageWrapper } from './pages/CustomersPageWrapper';
import { SuppliersPageWrapper } from './pages/SuppliersPageWrapper';
import { ItemsPageWrapper } from './pages/ItemsPageWrapper';
import { AnalyticsPageWrapper } from './pages/AnalyticsPageWrapper';
import { SubscriptionPageWrapper } from './pages/SubscriptionPageWrapper';
import { GstReportsPage } from './pages/GstReportsPage';
import { PartyLedgerPageWrapper } from './pages/PartyLedgerPageWrapper';
import { PaymentInPageWrapper } from './pages/PaymentInPageWrapper';
import { PosPageWrapper } from './pages/PosPageWrapper';

const router = createBrowserRouter([
  {
    path: "/",
    Component: AuthPage,
  },
  {
    path: "/profiles",
    Component: ProfilesPageWrapper,
  },
  {
    path: "/welcome",
    Component: WelcomePageWrapper,
  },
  {
    path: "/dashboard",
    Component: DashboardPageWrapper,
  },
  {
    path: "/documents",
    Component: DocumentsPageWrapper,
  },
  {
    path: "/documents/create",
    Component: CreateDocumentPageWrapper,
  },
  {
    path: "/documents/edit/:id",
    Component: CreateDocumentPageWrapper,
  },
  {
    path: "/customers",
    Component: CustomersPageWrapper,
  },
  {
    path: "/suppliers",
    Component: SuppliersPageWrapper,
  },
  {
    path: "/items",
    Component: ItemsPageWrapper,
  },
  {
    path: "/analytics",
    Component: AnalyticsPageWrapper,
  },
  {
    path: "/reports/gst",
    Component: GstReportsPage,
  },
  {
    path: "/ledger",
    Component: PartyLedgerPageWrapper,
  },
  {
    path: "/subscription",
    Component: SubscriptionPageWrapper,
  },
  {
    path: "/payments-in",
    Component: PaymentInPageWrapper,
  },
  {
    path: "/pos",
    Component: PosPageWrapper,
  },
]);

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <RouterProvider router={router} />
        <Toaster />
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
