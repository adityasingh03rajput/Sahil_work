import { ProtectedRoute } from '../components/ProtectedRoute';
import { DashboardPage } from './DashboardPage';
import { MobileDashboard } from '../mobile';
import { useIsNative } from '../hooks/useIsNative';

export function DashboardPageWrapper() {
  const isNative = useIsNative();
  return (
    <ProtectedRoute>
      {isNative ? <MobileDashboard /> : <DashboardPage />}
    </ProtectedRoute>
  );
}
