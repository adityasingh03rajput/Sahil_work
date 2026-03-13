import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { API_URL } from '../../config/api';
import { toast } from 'sonner';
import { ArrowLeft, Search, Users as UsersIcon, FileText, ShoppingCart, Building2, RefreshCw } from 'lucide-react';

export function MasterAdminUsersPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadUsers();
  }, [search]);

  const loadUsers = async () => {
    try {
      const token = localStorage.getItem('masterAdminToken');
      const params = new URLSearchParams();
      if (search) params.append('search', search);

      const response = await fetch(`${API_URL}/master-admin/users?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.error) {
        toast.error(data.error);
      } else {
        setUsers(data.users || []);
      }
    } catch (error) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleConvertToTenant = async (userId: string) => {
    if (!confirm('Convert this user to a tenant? This will allow you to assign licenses.')) return;

    try {
      const token = localStorage.getItem('masterAdminToken');
      const response = await fetch(`${API_URL}/master-admin/users/${userId}/convert-to-tenant`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.error) {
        toast.error(data.error);
      } else {
        toast.success('User converted to tenant!');
        loadUsers();
      }
    } catch (error) {
      toast.error('Failed to convert user');
    }
  };

  const getSubscriptionBadge = (subscription: any) => {
    if (!subscription) {
      return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">No Subscription</span>;
    }
    
    const endDate = new Date(subscription.endDate);
    const now = new Date();
    const isExpired = endDate < now;

    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${
        isExpired 
          ? 'bg-red-100 text-red-800 border-red-200' 
          : 'bg-green-100 text-green-800 border-green-200'
      }`}>
        {subscription.plan} {isExpired ? '(Expired)' : ''}
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
                <UsersIcon className="h-5 w-5 text-blue-600" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">All Users</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {users.length} users
              </span>
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
              placeholder="Search users by email, name, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading users...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <UsersIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No users found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {users.map((user) => (
              <div key={user._id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{user.name || 'Unnamed User'}</h3>
                      {getSubscriptionBadge(user.subscription)}
                      {user.tenant && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                          Tenant: {user.tenant.status}
                        </span>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-600">📧 {user.email}</p>
                      <p className="text-sm text-gray-600">📱 {user.phone}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4 pt-4 border-t border-gray-100">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <Building2 className="h-5 w-5 text-blue-600 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-gray-900">{user.stats.profiles}</p>
                    <p className="text-xs text-gray-600">Profiles</p>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <FileText className="h-5 w-5 text-green-600 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-gray-900">{user.stats.documents}</p>
                    <p className="text-xs text-gray-600">Documents</p>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <ShoppingCart className="h-5 w-5 text-purple-600 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-gray-900">{user.stats.customers}</p>
                    <p className="text-xs text-gray-600">Customers</p>
                  </div>
                </div>

                <div className="flex gap-2 pt-4 border-t border-gray-100">
                  {!user.tenant && (
                    <button
                      onClick={() => handleConvertToTenant(user._id)}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Convert to Tenant
                    </button>
                  )}
                  {user.tenant && (
                    <button
                      onClick={() => navigate(`/master-admin/tenants/${user.tenant.id}`)}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      <Building2 className="h-4 w-4 mr-2" />
                      Manage Tenant
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
