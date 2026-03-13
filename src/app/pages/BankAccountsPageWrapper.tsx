import { ProtectedRoute } from '../components/ProtectedRoute';
import { BankAccountsPage } from './BankAccountsPage';

export function BankAccountsPageWrapper() {
  return (
    <ProtectedRoute>
      <BankAccountsPage />
    </ProtectedRoute>
  );
}
