import { useState, useEffect } from 'react';
import { AppLayout } from '../components/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { 
  Check, 
  Crown, 
  Calendar,
  AlertCircle,
  Zap
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { API_URL } from '../config/api';
import { toast } from 'sonner';
import { TraceLoader } from '../components/TraceLoader';
import { cacheSubscriptionToken, validateSubscriptionTokenOnline } from '../utils/subscriptionValidation';

export function SubscriptionPage() {
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const { accessToken, deviceId } = useAuth();

  const apiUrl = API_URL;
  const currentProfile = JSON.parse(localStorage.getItem('currentProfile') || '{}');
  const profileId = currentProfile?.id;

  useEffect(() => {
    loadSubscription();
  }, []);

  const loadSubscription = async () => {
    try {
      if (profileId) {
        const online = await validateSubscriptionTokenOnline({
          apiUrl,
          accessToken: accessToken || '',
          deviceId,
          profileId,
        });
        if (online.ok && online.token) {
          cacheSubscriptionToken(profileId, online.token);
        }

        const response = await fetch(`${apiUrl}/subscription/validate`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'X-Device-ID': deviceId,
            'X-Profile-ID': profileId,
          },
        });
        const data = await response.json();
        if (!data?.error && data?.subscription) setSubscription(data.subscription);
      } else {
        const response = await fetch(`${apiUrl}/subscription`, {
          headers: { 'Authorization': `Bearer ${accessToken}`, 'X-Device-ID': deviceId },
        });
        const data = await response.json();
        if (!data.error) setSubscription(data);
      }
    } catch (error) {
      toast.error('Failed to load subscription');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (plan: 'monthly' | 'yearly') => {
    setPurchasing(true);
    try {
      const response = await fetch(`${apiUrl}/subscription/update`, {
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
    } catch (error) {
      toast.error('Failed to update subscription');
    } finally {
      setPurchasing(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const isActive = subscription && new Date(subscription.endDate) > new Date();
  const daysRemaining = subscription 
    ? Math.ceil((new Date(subscription.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0;

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
          <TraceLoader label="Loading subscription..." />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Subscription Plans</h1>
          <p className="text-muted-foreground">Choose the plan that works best for you</p>
        </div>

        {/* Current Subscription Status */}
        {subscription && (
          <Card className={`mb-8 ${isActive ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
            <CardContent className="py-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {isActive ? (
                    <Check className="h-6 w-6 text-green-600 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-6 w-6 text-yellow-600 mt-0.5" />
                  )}
                  <div>
                    <h3 className={`text-lg font-semibold ${isActive ? 'text-green-900' : 'text-yellow-900'}`}>
                      {isActive ? 'Active Subscription' : 'Subscription Expired'}
                    </h3>
                    <p className={`text-sm mt-1 ${isActive ? 'text-green-700' : 'text-yellow-700'}`}>
                      <span className="font-medium capitalize">{subscription.plan}</span> Plan
                      {' • '}
                      {isActive 
                        ? `${daysRemaining} days remaining`
                        : `Expired on ${formatDate(subscription.endDate)}`
                      }
                    </p>
                    <p className={`text-xs mt-1 ${isActive ? 'text-green-600' : 'text-yellow-600'}`}>
                      Valid from {formatDate(subscription.startDate)} to {formatDate(subscription.endDate)}
                    </p>
                  </div>
                </div>
                {!isActive && (
                  <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                    Renew Required
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-12">
          {/* Monthly Plan */}
          <Card className="relative border-2 hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <CardTitle className="text-2xl">Monthly Plan</CardTitle>
                <Zap className="h-6 w-6 text-blue-600" />
              </div>
              <div className="mt-4">
                <span className="text-4xl font-bold text-foreground">₹499</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <CardDescription className="mt-2">
                Perfect for trying out BillVyapar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full mb-6"
                onClick={() => handlePurchase('monthly')}
                disabled={purchasing || (subscription?.plan === 'monthly' && isActive)}
              >
                {purchasing ? 'Processing...' : 
                  subscription?.plan === 'monthly' && isActive ? 'Current Plan' : 'Get Monthly Plan'}
              </Button>
              <div className="space-y-3">
                <p className="text-sm font-semibold text-foreground/80 mb-3">Everything included:</p>
                {features.slice(0, 6).map((feature, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-foreground/80">{feature}</span>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground pt-2">+ 6 more features...</p>
              </div>
            </CardContent>
          </Card>

          {/* Yearly Plan */}
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
                <span className="text-4xl font-bold text-foreground">₹4,999</span>
                <span className="text-muted-foreground">/year</span>
              </div>
              <CardDescription className="mt-2">
                Save ₹999 compared to monthly billing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full mb-6 bg-green-600 hover:bg-green-700"
                onClick={() => handlePurchase('yearly')}
                disabled={purchasing || (subscription?.plan === 'yearly' && isActive)}
              >
                {purchasing ? 'Processing...' : 
                  subscription?.plan === 'yearly' && isActive ? 'Current Plan' : 'Get Yearly Plan'}
              </Button>
              <div className="space-y-3">
                <p className="text-sm font-semibold text-foreground/80 mb-3">All features included:</p>
                {features.map((feature, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-foreground/80">{feature}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* FAQ / Info */}
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle>Subscription Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold text-foreground mb-1">How does subscription work?</h4>
              <p className="text-sm text-muted-foreground">
                Your subscription starts from the exact date of purchase and remains active for the selected duration (30 days for monthly, 365 days for yearly).
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">What happens when my subscription expires?</h4>
              <p className="text-sm text-muted-foreground">
                All your data remains fully accessible and secure. However, you won't be able to create new documents, edit existing ones, or export PDFs until you renew your subscription.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">Can I switch between plans?</h4>
              <p className="text-sm text-muted-foreground">
                Yes! You can upgrade or downgrade at any time. When you switch plans, the new subscription period starts from the date of change.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">Is my data safe?</h4>
              <p className="text-sm text-muted-foreground">
                Absolutely. We use enterprise-grade encryption and security measures. Your data is automatically backed up and synced to the cloud. Single-device login ensures only you can access your account.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">Demo Mode</h4>
              <p className="text-sm text-muted-foreground">
                This is a demonstration version. In production, subscription payments would be processed through a secure payment gateway.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
