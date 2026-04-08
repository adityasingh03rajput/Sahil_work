import { ProtectedRoute } from '../components/ProtectedRoute';
import { DocumentsPage } from './DocumentsPage';
import { MobileDocuments } from '../mobile';
import { useIsNative } from '../hooks/useIsNative';

export function DocumentsPageWrapper() {
  const isNative = useIsNative();
  return (
    <ProtectedRoute>
      {isNative ? <MobileDocuments /> : <DocumentsPage />}
    </ProtectedRoute>
  );
}
