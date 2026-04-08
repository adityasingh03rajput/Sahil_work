import { ProtectedRoute } from '../components/ProtectedRoute';
import { ItemsPage } from './ItemsPage';
import { MobileItems } from '../mobile';
import { useIsNative } from '../hooks/useIsNative';

export function ItemsPageWrapper() {
  const isNative = useIsNative();
  return (
    <ProtectedRoute>
      {isNative ? <MobileItems /> : <ItemsPage />}
    </ProtectedRoute>
  );
}
