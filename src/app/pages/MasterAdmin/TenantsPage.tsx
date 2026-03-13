import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { API_URL } from '../../config/api';
import { toast } from 'sonner';
import { ArrowLeft, Search, Users, CheckCircle, XCircle, Clock, Ban, RefreshCw } from 'lucide-react';

export function MasterAdminTenantsPage() {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadTenants();
  }, [search]);

  const loadTenants = async () => {
    try {
      const token = localStorage.getItem('masterAdminToken');
      const params = new URLSearchParams();
      if (search) params.append('search', search);

      const response = await fetch(`${API_URL}/master-admin/tenants?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.error) {
        toast.error(data.error);
      } else {
        setTenants(data.tenants || []);
      }
    } catch (error) {
      toast.error('Failed to load tenants');
    } finally {
      setLoading(false);
    }
  };

  const handleSuspend = async (tenantId: string) => {
    if (!confirm('Are you sure you want to suspend this tenant?')) return;

    try {
      const token = localStorage.getItem('masterAdminToken');
      const response = await fetch(`${API_URL}/master-admin/tenants/${tenantId}/suspend`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.error) {
        toast.error(data.error);
      } else {
        toast.success('Tenant suspended');
        loadTenants();
      }
    } catch (error) {
      toast.error('Failed to suspend tenant');
    }
  };

  const handleReactivate = async (tenantId: string) => {
    try {
      const token = localStorage.getItem('masterAdminToken');
      const response = await fetch(`${API_URL}/master-admin/tenants/${tenantId}/reactivate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.error) {
        toast.error(data.error);
      } else {
        toast.success('Tenant reactivated');
        loadTenants();
      }
    } catch (error) {
      toast.error('Failed to reactivate tenant');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: any = {
      active: 'bg-green-100 text-green-800 border-green-200',
      expired: 'bg-red-100 text-red-800 border-red-200',
      suspended: 'bg-orange-100 text-orange-800 border-orange-200',
    };
    const icons: any = {
      active: <CheckCircle className="h-3 w-3" />,
      expired: <XCircle className="h-3 w-3" />,
      suspended: <Clock className="h-3 w-3" />,
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status] || styles.active}`}>
        {icons[status]}
        {status}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 gap-4">
            <button
              onClick={() => navigate('/master-admin/dashboard')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">Manage Tenants</h1>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search tenants by name, email, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading tenants...</p>
          </div>
        ) : tenants.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No tenants found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tenants.map((tenant) => (
              <div key={tenant._id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{tenant.name}</h3>
                      {getStatusBadge(tenant.status)}
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-600">📧 {tenant.email}</p>
                      <p className="text-sm text-gray-600">📱 {tenant.phone}</p>
                      {tenant.gstin && <p className="text-sm text-gray-600">🏢 GSTIN: {tenant.gstin}</p>}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-4 border-t border-gray-100">
                  {tenant.status === 'active' && (
                    <button
                      onClick={() => handleSuspend(tenant._id)}
                      className="inline-flex items-center px-4 py-2 border border-red-300 rounded-lg text-sm font-medium text-red-700 bg-white hover:bg-red-50 transition-colors"
                    >
                      <Ban className="h-4 w-4 mr-2" />
                      Suspend
                    </button>
                  )}
                  {tenant.status === 'suspended' && (
                    <button
                      onClick={() => handleReactivate(tenant._id)}
                      className="inline-flex items-center px-4 py-2 border border-green-300 rounded-lg text-sm font-medium text-green-700 bg-white hover:bg-green-50 transition-colors"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Reactivate
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
