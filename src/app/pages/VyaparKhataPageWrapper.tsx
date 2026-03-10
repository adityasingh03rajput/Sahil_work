import { ProtectedRoute } from '../components/ProtectedRoute';
import { VyaparKhataPage } from './VyaparKhataPage';

export function VyaparKhataPageWrapper() {
  return (
    <ProtectedRoute>
      <VyaparKhataPage />
    </ProtectedRoute>
  );
}
