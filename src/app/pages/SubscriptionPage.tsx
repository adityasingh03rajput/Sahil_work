import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Check, AlertCircle, Key, Clock, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { API_URL } from '../config/api';
import { toast } from 'sonner';
import { TraceLoader } from '../components/TraceLoader';

interface LicenseStatus {
  status: 'trial' | 'licensed' | 'expired';
  trial: { active: boolean; trialEndsAt: string; daysRemaining: number };
  license: {
    key: string;
    expiresAt: string;
    daysRemaining: number;
    durationDays: number;
  } | null;
}

export function SubscriptionPage() {
  const [status, setStatus] = useState<LicenseStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [licenseKey, setLicenseKey] = useState('');
  const [activating, setActivating] = useState(false);
  const { accessToken, deviceId, setSubscriptionExpired } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { loadStatus(); }, []);

  const loadStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/auth/license-status`, {
        headers: { Authorization: `Bearer ${accessToken}`, 'X-Device-ID': deviceId },
      });
      const data = await res.json();
      if (!data.error) setStatus(data);
    } catch {
      toast.error('Failed to load license status');
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async () => {
    const key = licenseKey.trim().toUpperCase();
    if (!key) return toast.error('Please enter a license key');
    setActivating(true);
    try {
      const res = await fetch(`${API_URL}/auth/activate-license`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
          'X-Device-ID': deviceId,
        },
        body: JSON.stringify({ key }),
      });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
      } else {
        toast.success('License activated successfully!');
        setLicenseKey('');
        setSubscriptionExpired(false);
        await loadStatus();
        navigate('/dashboard', { replace: true });
      }
    } catch {
      toast.error('Failed to activate license');
    } finally {
      setActivating(false);
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  if (loading) {
    return (
      <>
        <div className="flex items-center justify-center h-full">
          <TraceLoader label="Loading subscription..." />
        </div>
      </>
    );
  }

  const isLicensed = status?.status === 'licensed';
  const isTrial = status?.status === 'trial';
  const isExpired = status?.status === 'expired';

  return (
    <>
      <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Subscription</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your BillVyapar license</p>
        </div>

        {/* Status Card */}
        {status && (
          <Card className={
            isLicensed ? 'border-green-200 bg-green-50' :
            isTrial ? 'border-blue-200 bg-blue-50' :
            'border-red-200 bg-red-50'
          }>
            <CardContent className="py-5">
              <div className="flex items-start gap-3">
                {isLicensed && <ShieldCheck className="h-6 w-6 text-green-600 mt-0.5 shrink-0" />}
                {isTrial && <Clock className="h-6 w-6 text-blue-600 mt-0.5 shrink-0" />}
                {isExpired && <AlertCircle className="h-6 w-6 text-red-600 mt-0.5 shrink-0" />}
                <div className="flex-1">
                  {isLicensed && status.license && (
                    <>
                      <p className="font-semibold text-green-900">License Active</p>
                      <p className="text-sm text-green-700 mt-0.5">
                        {status.license.daysRemaining} days remaining · Expires {formatDate(status.license.expiresAt)}
                      </p>
                      <p className="text-xs text-green-600 mt-1 font-mono">{status.license.key}</p>
                    </>
                  )}
                  {isTrial && (
                    <>
                      <p className="font-semibold text-blue-900">Free Trial</p>
                      <p className="text-sm text-blue-700 mt-0.5">
                        {status.trial.daysRemaining} day{status.trial.daysRemaining !== 1 ? 's' : ''} remaining · Ends {formatDate(status.trial.trialEndsAt)}
                      </p>
                      <p className="text-xs text-blue-600 mt-1">Activate a license key before your trial ends to keep access.</p>
                    </>
                  )}
                  {isExpired && (
                    <>
                      <p className="font-semibold text-red-900">Access Expired</p>
                      <p className="text-sm text-red-700 mt-0.5">
                        Your 7-day trial has ended. Activate a license key to restore access.
                      </p>
                    </>
                  )}
                </div>
                <Badge variant="outline" className={
                  isLicensed ? 'bg-green-100 text-green-800 border-green-300' :
                  isTrial ? 'bg-blue-100 text-blue-800 border-blue-300' :
                  'bg-red-100 text-red-800 border-red-300'
                }>
                  {isLicensed ? 'Licensed' : isTrial ? 'Trial' : 'Expired'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* License Key Activation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Key className="h-4 w-4" />
              Activate License Key
            </CardTitle>
            <CardDescription>
              Enter the license key sent to your registered email address.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={licenseKey}
                onChange={e => setLicenseKey(e.target.value.toUpperCase())}
                placeholder="BVYP-XXXX-XXXX-XXXX"
                className="font-mono tracking-widest"
                onKeyDown={e => e.key === 'Enter' && handleActivate()}
              />
              <Button onClick={handleActivate} disabled={activating || !licenseKey.trim()}>
                {activating ? 'Activating...' : 'Activate'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              License keys are tied to your email address. Contact support if you haven't received yours.
            </p>
          </CardContent>
        </Card>

        {/* Features */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">What's included</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {[
                'Unlimited business profiles',
                'Invoices, Quotations, Orders & more',
                'Customer & item catalog management',
                'GST calculations & compliance',
                'PDF export & sharing',
                'Real-time analytics dashboard',
                'Offline mode with cloud sync',
              ].map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-foreground/80">
                  <Check className="h-4 w-4 text-green-600 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
