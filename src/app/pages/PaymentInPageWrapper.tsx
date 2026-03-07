import { ProtectedRoute } from '../components/ProtectedRoute';
import { PaymentInPage } from './PaymentInPage';

export function PaymentInPageWrapper() {
  return (
    <ProtectedRoute>
      <PaymentInPage />
    </ProtectedRoute>
  );
}
