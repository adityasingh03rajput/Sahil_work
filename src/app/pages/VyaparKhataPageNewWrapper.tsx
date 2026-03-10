import { ProtectedRoute } from '../components/ProtectedRoute';
import { VyaparKhataPageNew } from './VyaparKhataPageNew';

export function VyaparKhataPageNewWrapper() {
  return (
    <ProtectedRoute>
      <VyaparKhataPageNew />
    </ProtectedRoute>
  );
}
