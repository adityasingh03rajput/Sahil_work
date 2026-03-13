import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { API_URL } from '../../config/api';
import { toast } from 'sonner';
import { Users, AlertCircle, CheckCircle, Clock, DollarSign, LogOut, FileText, Package, Building2, TrendingUp } from 'lucide-react';

export function MasterAdminDashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const admin = JSON.parse(localStorage.getItem('masterAdmin') || '{}');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const token = localStorage.getItem('masterAdminToken');
      
      const [tenantResponse, dataResponse] = await Promise.all([
        fetch(`${API_URL}/master-admin/dashboard/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/master-admin/data/statistics`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const tenantData = await tenantResponse.json();
      const platformData = await dataResponse.json();
      
      if (tenantData.error || platformData.error) {
        toast.error(tenantData.error || platformData.error);
      } else {
        setStats({ ...tenantData, platform: platformData });
      }
    } catch (error) {
      toast.error('Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('masterAdminToken');
    localStorage.removeItem('masterAdmin');
    navigate('/master-admin/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div className="ml-3">
                <h1 className="text-xl font-bold text-gray-900">Master Admin Panel</h1>
                <p className="text-xs text-gray-500">Welcome, {admin.name || admin.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Tenant Management</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <span className="text-2xl font-bold text-gray-900">{stats?.totalTenants || 0}</span>
              </div>
              <h3 className="text-sm font-medium text-gray-600">Total Tenants</h3>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <span className="text-2xl font-bold text-green-600">{stats?.activeTenants || 0}</span>
              </div>
              <h3 className="text-sm font-medium text-gray-600">Active</h3>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
                <span className="text-2xl font-bold text-red-600">{stats?.expiredTenants || 0}</span>
              </div>
              <h3 className="text-sm font-medium text-gray-600">Expired</h3>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Clock className="h-6 w-6 text-orange-600" />
                </div>
                <span className="text-2xl font-bold text-orange-600">{stats?.suspendedTenants || 0}</span>
              </div>
              <h3 className="text-sm font-medium text-gray-600">Suspended</h3>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Platform Data</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-sm p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <Building2 className="h-8 w-8 opacity-80" />
                <span className="text-3xl font-bold">{stats?.platform?.totals?.profiles || 0}</span>
              </div>
              <h3 className="text-sm font-medium opacity-90">Business Profiles</h3>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-sm p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <FileText className="h-8 w-8 opacity-80" />
                <span className="text-3xl font-bold">{stats?.platform?.totals?.documents || 0}</span>
              </div>
              <h3 className="text-sm font-medium opacity-90">Documents</h3>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-sm p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <Users className="h-8 w-8 opacity-80" />
                <span className="text-3xl font-bold">{stats?.platform?.totals?.customers || 0}</span>
              </div>
              <h3 className="text-sm font-medium opacity-90">Customers</h3>
            </div>

            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-sm p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <Package className="h-8 w-8 opacity-80" />
                <span className="text-3xl font-bold">{stats?.platform?.totals?.items || 0}</span>
              </div>
              <h3 className="text-sm font-medium opacity-90">Items</h3>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Expiring in 7 Days</h3>
              <Clock className="h-5 w-5 text-gray-400" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats?.expiringIn7Days || 0}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Expiring in 30 Days</h3>
              <TrendingUp className="h-5 w-5 text-gray-400" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats?.expiringIn30Days || 0}</p>
          </div>

          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-sm p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium opacity-90">Total Revenue</h3>
              <DollarSign className="h-5 w-5 opacity-80" />
            </div>
            <p className="text-3xl font-bold">₹{(stats?.totalRevenue || 0).toLocaleString()}</p>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <button
              onClick={() => navigate('/master-admin/tenants')}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl p-6 text-left transition-colors"
            >
              <Users className="h-8 w-8 mb-3" />
              <h3 className="text-lg font-semibold mb-1">Manage Tenants</h3>
              <p className="text-sm opacity-90">View and manage all tenant accounts</p>
            </button>

            <button
              onClick={() => navigate('/master-admin/users')}
              className="bg-white hover:bg-gray-50 border-2 border-gray-200 rounded-xl p-6 text-left transition-colors"
            >
              <Building2 className="h-8 w-8 mb-3 text-gray-700" />
              <h3 className="text-lg font-semibold mb-1 text-gray-900">All Users</h3>
              <p className="text-sm text-gray-600">{stats?.platform?.totals?.profiles || 0} business profiles</p>
            </button>

            <button
              onClick={() => navigate('/master-admin/plans')}
              className="bg-white hover:bg-gray-50 border-2 border-gray-200 rounded-xl p-6 text-left transition-colors"
            >
              <Package className="h-8 w-8 mb-3 text-gray-700" />
              <h3 className="text-lg font-semibold mb-1 text-gray-900">Manage Plans</h3>
              <p className="text-sm text-gray-600">Configure subscription plans</p>
            </button>

            <button
              onClick={() => navigate('/master-admin/data')}
              className="bg-white hover:bg-gray-50 border-2 border-gray-200 rounded-xl p-6 text-left transition-colors"
            >
              <FileText className="h-8 w-8 mb-3 text-gray-700" />
              <h3 className="text-lg font-semibold mb-1 text-gray-900">Platform Data</h3>
              <p className="text-sm text-gray-600">View all platform statistics</p>
            </button>

            <button
              onClick={() => navigate('/master-admin/audit')}
              className="bg-white hover:bg-gray-50 border-2 border-gray-200 rounded-xl p-6 text-left transition-colors"
            >
              <TrendingUp className="h-8 w-8 mb-3 text-gray-700" />
              <h3 className="text-lg font-semibold mb-1 text-gray-900">Audit Logs</h3>
              <p className="text-sm text-gray-600">Track all admin actions</p>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
