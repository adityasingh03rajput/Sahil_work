import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Check, AlertCircle, Key, Clock, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { API_URL, FRONTEND_VERSION } from '../config/api';
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
  const [backendVersion, setBackendVersion] = useState<string | null>(null);
  const { accessToken, deviceId, setSubscriptionExpired } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadStatus();
    // Fetch backend version on mount
    fetch(`${API_URL}/version`)
      .then(r => r.json())
      .then(d => setBackendVersion(d?.backend || null))
      .catch(() => setBackendVersion('unavailable'));
  }, []);

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
    <div className="min-h-full font-sans">
      <div className="p-6 max-w-2xl mx-auto space-y-8 pb-12">
        <header className="text-center space-y-2 pt-4">
          <h1 className="text-3xl font-black tracking-tight text-primary">SUBSCRIPTION<span className="text-emerald-500">.</span></h1>
          <p className="text-muted-foreground font-bold text-sm tracking-widest uppercase">System License Control</p>
        </header>

        {/* Status Card */}
        {status && (
          <div className={`bg-card text-card-foreground rounded-[2rem] p-8 relative overflow-hidden group transition-all duration-500 border shadow-sm ${
            isLicensed ? 'border-emerald-500/30' : isTrial ? 'border-primary/30' : 'border-destructive/30'
          }`}>
            <div className={`absolute top-0 right-0 p-6`}>
              <div className={`text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-widest ${
                isLicensed ? 'bg-emerald-500 text-white' : isTrial ? 'bg-primary text-primary-foreground' : 'bg-destructive text-destructive-foreground'
              }`}>
                {isLicensed ? 'Operational' : isTrial ? 'Evaluation' : 'Terminated'}
              </div>
            </div>

            <div className="flex items-start gap-6">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border ${
                isLicensed ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' :
                isTrial ? 'bg-primary/10 border-primary/30 text-primary' :
                'bg-destructive/10 border-destructive/30 text-destructive'
              }`}>
                {isLicensed && <ShieldCheck className="h-8 w-8" />}
                {isTrial && <Clock className="h-8 w-8" />}
                {isExpired && <AlertCircle className="h-8 w-8" />}
              </div>

              <div className="flex-1 space-y-4">
                <div>
                  <h2 className={`text-xl font-black uppercase tracking-tight ${
                    isLicensed ? 'text-emerald-600 dark:text-emerald-400' : isTrial ? 'text-primary' : 'text-destructive'
                  }`}>
                    {isLicensed ? 'Active License' : isTrial ? 'Trial active' : 'Access Terminated'}
                  </h2>
                  
                  {isLicensed && status.license && (
                    <div className="mt-3 space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-3xl font-black text-foreground">{status.license.daysRemaining}</span>
                        <span className="text-muted-foreground font-bold text-xs uppercase tracking-widest">Days Remaining</span>
                      </div>
                      <p className="text-sm font-medium text-muted-foreground">Registry Expiry: <span className="text-foreground font-bold">{formatDate(status.license.expiresAt)}</span></p>
                      <div className="px-4 py-2 rounded-xl bg-muted border border-border font-mono text-[10px] text-muted-foreground tracking-widest">
                        {status.license.key}
                      </div>
                    </div>
                  )}

                  {isTrial && (
                    <div className="mt-3 space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-3xl font-black text-foreground">{status.trial.daysRemaining}</span>
                        <span className="text-muted-foreground font-bold text-xs uppercase tracking-widest">Trial Days</span>
                      </div>
                      <p className="text-sm font-medium text-muted-foreground leading-relaxed">
                        Evaluation ends <span className="text-foreground font-bold">{formatDate(status.trial.trialEndsAt)}</span>. 
                        Deploy a permanent license key to maintain terminal access.
                      </p>
                    </div>
                  )}

                  {isExpired && (
                    <div className="mt-3">
                      <p className="text-sm font-medium text-destructive leading-relaxed">
                        Security override enabled. Trial duration exhausted. 
                        Please supply a valid operational key to re-enable business modules.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* License Key Activation */}
        <div className="bg-card text-card-foreground rounded-[2rem] p-8 space-y-6 shadow-sm border border-border">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
              <Key className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-black text-foreground tracking-tight uppercase">Registry Keys</h3>
              <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Activate Operational Suite</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="relative group">
              <input
                value={licenseKey}
                onChange={e => setLicenseKey(e.target.value.toUpperCase())}
                placeholder="BVYP-XXXX-XXXX-XXXX"
                className="w-full bg-input-background border border-border rounded-2xl h-16 px-6 font-mono text-lg tracking-[0.2em] text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 outline-none transition-all"
                onKeyDown={e => e.key === 'Enter' && handleActivate()}
              />
              <div className="absolute inset-0 bg-primary/5 rounded-2xl -z-10 blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
            </div>

            <button
              onClick={handleActivate}
              disabled={activating || !licenseKey.trim()}
              className="w-full h-16 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black tracking-widest uppercase transition-all shadow-xl shadow-primary/20 active:scale-[0.98] disabled:opacity-40"
            >
              {activating ? 'Authenticating...' : 'Deploy License'}
            </button>
            <p className="text-center text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">
              Encrypted Registry Transmission
            </p>
          </div>
        </div>

        {/* Features Checklist */}
        <div className="bg-card text-card-foreground rounded-[2rem] p-8 border border-border shadow-sm">
          <h4 className="text-xs font-black text-primary uppercase tracking-[0.2em] mb-6">Operational Modules</h4>
          <div className="grid gap-4">
            {[
              'Universal Business Registry',
              'Multi-Type Document Generation',
              'Advanced Catalog Control',
              'GST Compliance Engine',
              'Strategic Analytics Suite',
              'Offline Security Sync',
              'PDF Deployment Modules'
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Check className="h-3 w-3 text-primary" />
                </div>
                <span className="text-sm font-bold text-foreground/80 uppercase tracking-wide">{f}</span>
              </div>
            ))}
          </div>
        </div>

        <footer className="pt-8 text-center space-y-4">
          <div className="flex flex-wrap items-center justify-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">FRONTEND v{FRONTEND_VERSION}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${backendVersion && backendVersion !== 'unavailable' ? 'bg-emerald-500' : 'bg-destructive'}`} />
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">BACKEND {backendVersion ? `v${backendVersion}` : 'OFFLINE'}</span>
            </div>
          </div>
          <button
            type="button"
            className="text-[10px] font-black text-primary/60 uppercase tracking-widest hover:text-primary transition-colors"
            onClick={() => {
              setBackendVersion(null);
              fetch(`${API_URL}/version`)
                .then(r => r.json())
                .then(d => setBackendVersion(d?.backend || null))
                .catch(() => setBackendVersion('unavailable'));
            }}
          >
            Refresh Heartbeat
          </button>
        </footer>
      </div>
    </div>
  );
}
