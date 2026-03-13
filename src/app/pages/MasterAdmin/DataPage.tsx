import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { API_URL } from '../../config/api';
import { toast } from 'sonner';
import { ArrowLeft, FileText, Users, Package, Building2, TrendingUp, BarChart3 } from 'lucide-react';

export function MasterAdminDataPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const token = localStorage.getItem('masterAdminToken');
      const response = await fetch(`${API_URL}/master-admin/data/statistics`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.error) {
        toast.error(data.error);
      } else {
        setStats(data);
      }
    } catch (error) {
      toast.error('Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading statistics...</p>
        </div>
      </div>
    );
  }

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
                <BarChart3 className="h-5 w-5 text-blue-600" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">Platform Data</h1>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-sm p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <FileText className="h-8 w-8 opacity-80" />
              <TrendingUp className="h-5 w-5 opacity-60" />
            </div>
            <p className="text-3xl font-bold mb-1">{stats?.totals.documents || 0}</p>
            <p className="text-sm opacity-90">Total Documents</p>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-sm p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <Users className="h-8 w-8 opacity-80" />
              <TrendingUp className="h-5 w-5 opacity-60" />
            </div>
            <p className="text-3xl font-bold mb-1">{stats?.totals.customers || 0}</p>
            <p className="text-sm opacity-90">Total Customers</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-sm p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <Package className="h-8 w-8 opacity-80" />
              <TrendingUp className="h-5 w-5 opacity-60" />
            </div>
            <p className="text-3xl font-bold mb-1">{stats?.totals.items || 0}</p>
            <p className="text-sm opacity-90">Total Items</p>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-sm p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <Building2 className="h-8 w-8 opacity-80" />
              <TrendingUp className="h-5 w-5 opacity-60" />
            </div>
            <p className="text-3xl font-bold mb-1">{stats?.totals.profiles || 0}</p>
            <p className="text-sm opacity-90">Business Profiles</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Documents by Type</h2>
            </div>
            <div className="space-y-3">
              {Object.entries(stats?.documentsByType || {}).map(([type, count]: [string, any]) => (
                <div key={type} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="capitalize text-sm font-medium text-gray-700">{type}</span>
                  <span className="text-lg font-bold text-gray-900">{count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Recent Documents</h2>
            </div>
            <div className="space-y-3">
              {stats?.recentDocuments?.length > 0 ? (
                stats.recentDocuments.map((doc: any) => (
                  <div key={doc._id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium text-sm text-gray-900">{doc.documentNumber}</span>
                      <span className="text-sm font-semibold text-green-600">₹{doc.grandTotal?.toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-gray-600">{doc.customerName}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">No recent documents</p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-sm p-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">Platform Overview</h2>
              <p className="text-sm opacity-90">Complete statistics of all platform data</p>
            </div>
            <BarChart3 className="h-16 w-16 opacity-60" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <p className="text-2xl font-bold">{stats?.totals.suppliers || 0}</p>
              <p className="text-xs opacity-90">Suppliers</p>
            </div>
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <p className="text-2xl font-bold">{stats?.totals.invoices || 0}</p>
              <p className="text-xs opacity-90">Invoices</p>
            </div>
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <p className="text-2xl font-bold">{stats?.totals.quotations || 0}</p>
              <p className="text-xs opacity-90">Quotations</p>
            </div>
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <p className="text-2xl font-bold">{stats?.totals.challans || 0}</p>
              <p className="text-xs opacity-90">Challans</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
