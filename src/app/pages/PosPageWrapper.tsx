import { ProtectedRoute } from '../components/ProtectedRoute';
import { PosPage } from './PosPage';

export function PosPageWrapper() {
  return (
    <ProtectedRoute>
      <PosPage />
    </ProtectedRoute>
  );
}
