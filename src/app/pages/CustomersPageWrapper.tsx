import { ProtectedRoute } from '../components/ProtectedRoute';
import { CustomersPage } from './CustomersPage';
import { MobileCustomers } from '../mobile';
import { useIsNative } from '../hooks/useIsNative';

export function CustomersPageWrapper() {
  return (
    <ProtectedRoute>
      <CustomersPage />
    </ProtectedRoute>
  );
}
