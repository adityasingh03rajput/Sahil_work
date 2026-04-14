import { useLocation } from 'react-router';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { DocumentsPage } from './DocumentsPage';
import { MobileDocuments } from '../mobile';
import { useIsNative } from '../hooks/useIsNative';

export function DocumentsPageWrapper() {
  const isNative = useIsNative();
  const location = useLocation();
  const hasDocId = new URLSearchParams(location.search).has('id');

  return (
    <ProtectedRoute>
      {(isNative && !hasDocId) ? <MobileDocuments /> : <DocumentsPage />}
    </ProtectedRoute>
  );
}
