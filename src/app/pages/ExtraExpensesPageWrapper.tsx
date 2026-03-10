import { ProtectedRoute } from '../components/ProtectedRoute';
import { ExtraExpensesPage } from './ExtraExpensesPage';

export function ExtraExpensesPageWrapper() {
  return (
    <ProtectedRoute>
      <ExtraExpensesPage />
    </ProtectedRoute>
  );
}
