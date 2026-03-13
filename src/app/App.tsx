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
import { BankAccountsPageWrapper } from './pages/BankAccountsPageWrapper';
import { PosPageWrapper } from './pages/PosPageWrapper';
import { ExtraExpensesPageWrapper } from './pages/ExtraExpensesPageWrapper';
import { VyaparKhataPageWrapper } from './pages/VyaparKhataPageWrapper';
import { VyaparKhataPageNewWrapper } from './pages/VyaparKhataPageNewWrapper';
import { MasterAdminLoginPage } from './pages/MasterAdmin/LoginPage';
import { MasterAdminDashboardPage } from './pages/MasterAdmin/DashboardPage';
import { MasterAdminTenantsPage } from './pages/MasterAdmin/TenantsPage';
import { MasterAdminTenantDetailsPage } from './pages/MasterAdmin/TenantDetailsPage';
import { MasterAdminPlansPage } from './pages/MasterAdmin/PlansPage';
import { MasterAdminAuditPage } from './pages/MasterAdmin/AuditPage';
import { MasterAdminUsersPage } from './pages/MasterAdmin/UsersPage';
import { MasterAdminDataPage } from './pages/MasterAdmin/DataPage';

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
    path: "/bank-accounts",
    Component: BankAccountsPageWrapper,
  },
  {
    path: "/pos",
    Component: PosPageWrapper,
  },
  {
    path: "/extra-expenses",
    Component: ExtraExpensesPageWrapper,
  },
  {
    path: "/vyapar-khata",
    Component: VyaparKhataPageWrapper,
  },
  {
    path: "/vyapar-khata-new",
    Component: VyaparKhataPageNewWrapper,
  },
  {
    path: "/master-admin/login",
    Component: MasterAdminLoginPage,
  },
  {
    path: "/master-admin/dashboard",
    Component: MasterAdminDashboardPage,
  },
  {
    path: "/master-admin/tenants",
    Component: MasterAdminTenantsPage,
  },
  {
    path: "/master-admin/tenants/:id",
    Component: MasterAdminTenantDetailsPage,
  },
  {
    path: "/master-admin/plans",
    Component: MasterAdminPlansPage,
  },
  {
    path: "/master-admin/audit",
    Component: MasterAdminAuditPage,
  },
  {
    path: "/master-admin/users",
    Component: MasterAdminUsersPage,
  },
  {
    path: "/master-admin/data",
    Component: MasterAdminDataPage,
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
