import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { API_URL } from '../../config/api';
import { toast } from 'sonner';
import { ArrowLeft, Building2, Mail, Phone, CreditCard, Calendar, Users, Package, CheckCircle, XCircle, Clock } from 'lucide-react';

export function MasterAdminTenantDetailsPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [tenant, setTenant] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTenantDetails();
  }, [id]);

  const loadTenantDetails = async () => {
    try {
      const token = localStorage.getItem('masterAdminToken');
      const response = await fetch(`${API_URL}/master-admin/tenants/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.error) {
        toast.error(data.error);
        navigate('/master-admin/tenants');
      } else {
        // Flatten the response structure
        setTenant({
          ...data.tenant,
          license: data.license,
          ownerUser: data.ownerUser,
          payments: [], // No payments in this endpoint yet
        });
      }
    } catch (error) {
      toast.error('Failed to load tenant details');
      navigate('/master-admin/tenants');
    } finally {
      setLoading(false);
    }
  };

  const handleSuspend = async () => {
    if (!confirm('Are you sure you want to suspend this tenant?')) return;

    try {
      const token = localStorage.getItem('masterAdminToken');
      const response = await fetch(`${API_URL}/master-admin/tenants/${id}/suspend`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.error) {
        toast.error(data.error);
      } else {
        toast.success('Tenant suspended');
        loadTenantDetails();
      }
    } catch (error) {
      toast.error('Failed to suspend tenant');
    }
  };

  const handleReactivate = async () => {
    try {
      const token = localStorage.getItem('masterAdminToken');
      const response = await fetch(`${API_URL}/master-admin/tenants/${id}/reactivate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.error) {
        toast.error(data.error);
      } else {
        toast.success('Tenant reactivated');
        loadTenantDetails();
      }
    } catch (error) {
      toast.error('Failed to reactivate tenant');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading tenant details...</p>
        </div>
      </div>
    );
  }

  if (!tenant) {
    return null;
  }

  const getStatusBadge = (status: string) => {
    if (!status) return null;
    
    const styles: any = {
      active: 'bg-green-100 text-green-800 border-green-200',
      expired: 'bg-red-100 text-red-800 border-red-200',
      suspended: 'bg-orange-100 text-orange-800 border-orange-200',
    };
    const icons: any = {
      active: <CheckCircle className="h-4 w-4" />,
      expired: <XCircle className="h-4 w-4" />,
      suspended: <Clock className="h-4 w-4" />,
    };
    return (
      <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border ${styles[status] || styles.active}`}>
        {icons[status]}
        {status.toUpperCase()}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 gap-4">
            <button
              onClick={() => navigate('/master-admin/tenants')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">Tenant Details</h1>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{tenant.name}</h2>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-gray-600">
                  <Mail className="h-4 w-4" />
                  <span>{tenant.email}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone className="h-4 w-4" />
                  <span>{tenant.phone}</span>
                </div>
                {tenant.gstin && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <CreditCard className="h-4 w-4" />
                    <span>GSTIN: {tenant.gstin}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-3">
              {getStatusBadge(tenant.status)}
              <div className="flex gap-2">
                {tenant.status === 'active' && (
                  <button
                    onClick={handleSuspend}
                    className="px-4 py-2 border border-red-300 rounded-lg text-sm font-medium text-red-700 bg-white hover:bg-red-50 transition-colors"
                  >
                    Suspend Tenant
                  </button>
                )}
                {tenant.status === 'suspended' && (
                  <button
                    onClick={handleReactivate}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Reactivate Tenant
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-gray-100">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <Calendar className="h-6 w-6 text-gray-500 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Created</p>
              <p className="text-lg font-semibold text-gray-900">
                {new Date(tenant.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <Users className="h-6 w-6 text-gray-500 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Owner User ID</p>
              <p className="text-xs font-mono text-gray-900 break-all">
                {tenant.ownerUserId}
              </p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <Package className="h-6 w-6 text-gray-500 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Tenant ID</p>
              <p className="text-xs font-mono text-gray-900 break-all">
                {tenant._id}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">License Information</h3>
            {tenant.license ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">Plan</span>
                  <span className="font-semibold text-gray-900">{tenant.license.plan?.displayName || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">Start Date</span>
                  <span className="font-semibold text-gray-900">
                    {tenant.license.licenseStartAt ? new Date(tenant.license.licenseStartAt).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">End Date</span>
                  <span className="font-semibold text-gray-900">
                    {tenant.license.licenseEndAt ? new Date(tenant.license.licenseEndAt).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">Max Seats</span>
                  <span className="font-semibold text-gray-900">{tenant.license.maxSeats || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">Payment State</span>
                  <span className={`font-semibold ${
                    tenant.license.paymentState === 'paid' ? 'text-green-600' : 'text-orange-600'
                  }`}>
                    {tenant.license.paymentState || 'N/A'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Package className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p>No license assigned</p>
                <button className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
                  Assign License
                </button>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment History</h3>
            {tenant.payments && tenant.payments.length > 0 ? (
              <div className="space-y-3">
                {tenant.payments.map((payment: any) => (
                  <div key={payment._id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-semibold text-gray-900">₹{payment.amount.toLocaleString()}</span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        payment.status === 'paid' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {payment.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">
                      {new Date(payment.paidAt || payment.createdAt).toLocaleDateString()}
                    </p>
                    {payment.mode && (
                      <p className="text-xs text-gray-500 mt-1">via {payment.mode}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <CreditCard className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p>No payment history</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
