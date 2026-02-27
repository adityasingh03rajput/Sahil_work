import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { AppLayout } from '../components/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Check, Crown, Zap } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { API_URL } from '../config/api';
import { toast } from 'sonner';
import { TraceLoader } from '../components/TraceLoader';
import { cacheSubscriptionToken, validateSubscriptionTokenOnline } from '../utils/subscriptionValidation';

export function WelcomePage() {
  const navigate = useNavigate();
  const { accessToken, deviceId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<any>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [checkingProfiles, setCheckingProfiles] = useState(false);
  const currentProfile = JSON.parse(localStorage.getItem('currentProfile') || '{}');
  const profileId = currentProfile?.id;

  useEffect(() => {
    loadSubscription();
  }, []);

  const loadSubscription = async () => {
    try {
      if (profileId) {
        const online = await validateSubscriptionTokenOnline({
          apiUrl: API_URL,
          accessToken: accessToken || '',
          deviceId,
          profileId,
        });
        if (online.ok && online.token) {
          cacheSubscriptionToken(profileId, online.token);
        }

        const res = await fetch(`${API_URL}/subscription/validate`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'X-Device-ID': deviceId,
            'X-Profile-ID': profileId,
          },
        });
        const data = await res.json();
        if (!data?.error && data?.subscription) setSubscription(data.subscription);
      } else {
        const res = await fetch(`${API_URL}/subscription`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'X-Device-ID': deviceId,
          },
        });
        const data = await res.json();
        if (!data?.error) setSubscription(data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (plan: 'monthly' | 'yearly') => {
    setPurchasing(true);
    try {
      const response = await fetch(`${API_URL}/subscription/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'X-Device-ID': deviceId,
        },
        body: JSON.stringify({ plan }),
      });

      const data = await response.json();
      if (data.error) {
        toast.error(data.error);
      } else {
        toast.success(`${plan === 'monthly' ? 'Monthly' : 'Yearly'} plan activated!`);
        setSubscription(data);
        await loadSubscription();
      }
    } catch {
      toast.error('Failed to update subscription');
    } finally {
      setPurchasing(false);
    }
  };

  const isActive = subscription?.endDate ? new Date(subscription.endDate) > new Date() : false;

  useEffect(() => {
    const maybeRedirectToProfiles = async () => {
      if (!accessToken || !deviceId) return;
      if (!isActive) return;
      if (checkingProfiles) return;

      try {
        setCheckingProfiles(true);
        const res = await fetch(`${API_URL}/profiles`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'X-Device-ID': deviceId,
          },
        });
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          navigate('/profiles');
        }
      } catch {
        // ignore
      } finally {
        setCheckingProfiles(false);
      }
    };

    if (!loading) {
      maybeRedirectToProfiles();
    }
  }, [accessToken, checkingProfiles, deviceId, isActive, loading, navigate]);

  const features = [
    'Unlimited business profiles',
    'Create unlimited documents (Invoices, Quotations, Orders, etc.)',
    'Customer & item catalog management',
    'GST calculations & compliance',
    'PDF export & sharing',
    'Real-time analytics dashboard',
    'Offline mode with cloud sync',
    'Document version tracking',
    'Document conversion (Quote to Invoice, etc.)',
    'Single-device security',
    'Payment tracking & reminders',
    'Custom fields & templates',
  ];

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <TraceLoader label="Loading..." />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to BillVyapar</h1>
          <p className="text-gray-600">
            {isActive
              ? 'Subscription active. Continue to create/select your business profile.'
              : 'Choose a subscription plan to get started'}
          </p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <Button onClick={() => navigate('/subscription')} variant="outline">View Subscription</Button>
            <Button disabled={!isActive} onClick={() => navigate('/profiles')}>
              Continue to Create Profile
            </Button>
          </div>
        </div>

        {!isActive && (
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-12">
            <Card className="relative border-2 hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <CardTitle className="text-2xl">Monthly Plan</CardTitle>
                  <Zap className="h-6 w-6 text-blue-600" />
                </div>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-gray-900">₹499</span>
                  <span className="text-gray-600">/month</span>
                </div>
                <CardDescription className="mt-2">Perfect for trying out BillVyapar</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full mb-6"
                  onClick={() => handlePurchase('monthly')}
                  disabled={purchasing}
                >
                  {purchasing ? 'Processing...' : 'Get Monthly Plan'}
                </Button>
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-gray-700 mb-3">Everything included:</p>
                  {features.slice(0, 6).map((feature, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </div>
                  ))}
                  <p className="text-xs text-gray-500 pt-2">+ 6 more features...</p>
                </div>
              </CardContent>
            </Card>

            <Card className="relative border-2 border-green-200 hover:shadow-xl transition-shadow bg-gradient-to-br from-green-50 to-white">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-green-600 text-white px-4 py-1">
                  <Crown className="h-3 w-3 mr-1 inline" />
                  Best Value - Save 17%
                </Badge>
              </div>
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <CardTitle className="text-2xl">Yearly Plan</CardTitle>
                  <Crown className="h-6 w-6 text-green-600" />
                </div>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-gray-900">₹4,999</span>
                  <span className="text-gray-600">/year</span>
                </div>
                <CardDescription className="mt-2">Save ₹999 compared to monthly billing</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full mb-6 bg-green-600 hover:bg-green-700"
                  onClick={() => handlePurchase('yearly')}
                  disabled={purchasing}
                >
                  {purchasing ? 'Processing...' : 'Get Yearly Plan'}
                </Button>
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-gray-700 mb-3">All features included:</p>
                  {features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
