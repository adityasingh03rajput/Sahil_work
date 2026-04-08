import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
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
      <>
        <div className="flex items-center justify-center h-full">
          <TraceLoader label="Loading..." />
        </div>
      </>
    );
  }

  return (
    <div className="min-h-full font-sans">
      <div className="p-6 max-w-5xl mx-auto space-y-12">
        <header className="text-center space-y-6 pt-8">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-primary blur-3xl opacity-30 animate-pulse" />
            <div className="relative w-24 h-24 mx-auto rounded-3xl bg-primary flex items-center justify-center border border-border shadow-2xl scale-110">
              <Crown className="h-12 w-12 text-primary-foreground" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-4xl font-black tracking-tight text-primary">BILLVYAPAR<span className="text-emerald-500">.</span></h1>
            <p className="text-muted-foreground font-medium text-lg">
              {isActive
                ? 'Strategic Command: Subscription Operational'
                : 'Initialize Your Enterprise Protocol'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={() => navigate('/subscription')} className="px-6 py-3 rounded-2xl bg-muted border border-border text-foreground font-bold text-sm tracking-widest hover:bg-muted/80 transition-all uppercase">
              Audit Status
            </button>
            <button 
              disabled={!isActive} 
              onClick={() => navigate('/profiles')}
              className="px-8 py-3 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-sm tracking-widest transition-all shadow-xl shadow-primary/20 uppercase active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Access Business Vaults
            </button>
          </div>
        </header>

        {!isActive && (
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {/* Monthly Plan */}
            <div className="bg-card text-card-foreground border border-border shadow-sm relative rounded-[2.5rem] p-10 flex flex-col group hover:border-primary/50 transition-all duration-500">
              <div className="flex items-center justify-between mb-8">
                <span className="text-xs font-black tracking-[0.2em] text-primary uppercase">Lite Protocol</span>
                <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 group-hover:bg-primary/20 transition-colors">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
              </div>
              
              <div className="mb-8">
                <h2 className="text-3xl font-black text-foreground mb-2">Monthly</h2>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-black text-foreground">₹499</span>
                  <span className="text-muted-foreground font-bold">/cycle</span>
                </div>
                <p className="mt-4 text-muted-foreground text-sm font-medium leading-relaxed">Essential systems for immediate operations and growth tracking.</p>
              </div>

              <button
                disabled={purchasing}
                onClick={() => handlePurchase('monthly')}
                className="w-full py-5 rounded-2xl bg-muted border border-border text-foreground font-black tracking-widest uppercase hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all disabled:opacity-50 mt-auto"
              >
                {purchasing ? 'Syncing...' : 'Activate System'}
              </button>

              <div className="mt-10 space-y-4 border-t border-border pt-8">
                {features.slice(0, 6).map((feature, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                      <Check className="h-3 w-3 text-emerald-500" />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Yearly Plan */}
            <div className="bg-primary/5 text-card-foreground border border-primary/30 relative rounded-[2.5rem] p-10 flex flex-col group transition-all duration-500 overflow-hidden shadow-md">
              <div className="absolute top-0 right-0 p-6">
                <div className="bg-emerald-500 text-white text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-widest shadow-lg shadow-emerald-500/20">Elite Value</div>
              </div>

              <div className="flex items-center justify-between mb-8">
                <span className="text-xs font-black tracking-[0.2em] text-primary uppercase">Enterprise Total</span>
                <div className="p-2.5 rounded-xl bg-primary/20 border border-primary/40">
                  <Crown className="h-6 w-6 text-primary" />
                </div>
              </div>
              
              <div className="mb-8">
                <h2 className="text-3xl font-black text-foreground mb-2">Yearly</h2>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-black text-foreground">₹4,999</span>
                  <span className="text-muted-foreground font-bold">/annum</span>
                </div>
                <p className="mt-4 text-muted-foreground text-sm font-medium leading-relaxed">The definitive enterprise suite. Save ₹999 on the annual commitment.</p>
              </div>

              <button
                disabled={purchasing}
                onClick={() => handlePurchase('yearly')}
                className="w-full py-5 rounded-2xl bg-primary text-primary-foreground font-black tracking-widest uppercase hover:bg-primary/90 transition-all shadow-xl shadow-primary/30 active:scale-95 disabled:opacity-50 mt-auto"
              >
                {purchasing ? 'Syncing...' : 'Deploy Annual Fleet'}
              </button>

              <div className="mt-10 space-y-4 border-t border-primary/20 pt-8">
                {features.map((feature, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center">
                      <Check className="h-3 w-3 text-primary" />
                    </div>
                    <span className="text-sm font-bold text-foreground/90">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
