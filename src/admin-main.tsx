import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, createHashRouter, RouterProvider, useNavigate, Outlet, Navigate } from 'react-router';
import { Toaster } from './app/components/ui/sonner';
import { ThemeProvider } from './app/contexts/ThemeContext';
import { MasterAdminLoginPage } from './app/pages/MasterAdmin/LoginPage';
import { MasterAdminDashboardPage } from './app/pages/MasterAdmin/DashboardPage';
import { MasterAdminSubscribersPage } from './app/pages/MasterAdmin/SubscribersPage';
import { MasterAdminSubscriberDetailsPage } from './app/pages/MasterAdmin/SubscriberDetailsPage';
import { MasterAdminAuditPage } from './app/pages/MasterAdmin/AuditPage';
import { MasterAdminUsersPage } from './app/pages/MasterAdmin/UsersPage';
import { MasterAdminDataPage } from './app/pages/MasterAdmin/DataPage';
import { MasterAdminLicenseKeysPage } from './app/pages/MasterAdmin/LicenseKeysPage';
import { MasterAdminAdminAccountsPage } from './app/pages/MasterAdmin/AdminAccountsPage';
import { ConsoleLayout } from './app/pages/MasterAdmin/ConsoleLayout';
import './styles/index.css';

localStorage.removeItem('apiUrlOverride');

function RouterError() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <p className="text-6xl font-bold text-gray-300 mb-4">Oops</p>
        <p className="text-gray-600 mb-6">Something went wrong</p>
        <button onClick={() => navigate('/dashboard')} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}

function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <p className="text-6xl font-bold text-gray-300 mb-4">404</p>
        <p className="text-gray-600 mb-6">Page not found</p>
        <button onClick={() => navigate('/dashboard')} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}

// Redirect to login if no token is stored
function RequireAuth() {
  const token = localStorage.getItem('masterAdminToken');
  if (!token) return <Navigate to="/" replace />;
  return (
    <ConsoleLayout>
      <Outlet />
    </ConsoleLayout>
  );
}

// Redirect already-logged-in admins away from the login page
function GuestOnly() {
  const token = localStorage.getItem('masterAdminToken');
  if (token) return <Navigate to="/dashboard" replace />;
  return <MasterAdminLoginPage />;
}

const createRouter = window.location.protocol === 'file:' ? createHashRouter : createBrowserRouter;
const router = createRouter([
  { path: '/', Component: GuestOnly, errorElement: <RouterError /> },
  {
    Component: RequireAuth,
    errorElement: <RouterError />,
    children: [
      { path: '/dashboard',        Component: MasterAdminDashboardPage },
      { path: '/subscribers',      Component: MasterAdminSubscribersPage },
      { path: '/subscribers/:id',  Component: MasterAdminSubscriberDetailsPage },
      { path: '/audit',            Component: MasterAdminAuditPage },
      { path: '/users',            Component: MasterAdminUsersPage },
      { path: '/data',             Component: MasterAdminDataPage },
      { path: '/license-keys',     Component: MasterAdminLicenseKeysPage },
      { path: '/admin-accounts',   Component: MasterAdminAdminAccountsPage },
      { path: '*',                 Component: NotFound },
    ],
  },
  { path: '*', Component: NotFound },
], window.location.protocol === 'file:' ? {} : { basename: '/admin' });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <RouterProvider router={router} />
      <Toaster />
    </ThemeProvider>
  </StrictMode>
);
