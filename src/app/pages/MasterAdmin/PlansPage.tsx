import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { API_URL } from '../../config/api';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Package, DollarSign, Users, Calendar } from 'lucide-react';

export function MasterAdminPlansPage() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const token = localStorage.getItem('masterAdminToken');
      const response = await fetch(`${API_URL}/master-admin/plans`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.error) {
        toast.error(data.error);
      } else {
        setPlans(data.plans || []);
      }
    } catch (error) {
      toast.error('Failed to load plans');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/master-admin/dashboard')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Package className="h-5 w-5 text-blue-600" />
                </div>
                <h1 className="text-xl font-bold text-gray-900">Manage Plans</h1>
              </div>
            </div>
            <button
              onClick={() => toast.info('Create plan feature coming soon')}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Plan
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading plans...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div key={plan._id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 text-white">
                  <h3 className="text-2xl font-bold mb-2">{plan.displayName}</h3>
                  <p className="text-sm opacity-90">{plan.description}</p>
                </div>

                <div className="p-6 space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <h4 className="text-sm font-semibold text-gray-700">Duration Options</h4>
                    </div>
                    <div className="space-y-2">
                      {plan.durations?.map((d: any, i: number) => (
                        <div key={i} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                          <span className="text-sm text-gray-700">{d.days} days</span>
                          <span className="text-sm font-semibold text-blue-600">₹{d.price.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-700">Seat Price</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">₹{plan.seatPrice?.toLocaleString() || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-700">Max Seats</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">{plan.limits?.maxSeats || 'Unlimited'}</span>
                    </div>
                  </div>

                  {plan.limits && (
                    <div className="pt-4 border-t border-gray-100">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Limits</h4>
                      <div className="space-y-1 text-sm text-gray-600">
                        {plan.limits.documentsPerMonth && (
                          <p>📄 {plan.limits.documentsPerMonth} docs/month</p>
                        )}
                        {plan.limits.maxCustomers && (
                          <p>👥 {plan.limits.maxCustomers} customers</p>
                        )}
                        {plan.limits.maxItems && (
                          <p>📦 {plan.limits.maxItems} items</p>
                        )}
                      </div>
                    </div>
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
