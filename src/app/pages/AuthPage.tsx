import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { toast } from 'sonner';
import { API_URL, clearApiUrlOverride, getApiUrlOverride, setApiUrlOverride, getApiUrl } from '../config/api';
import { useIsNative } from '../hooks/useIsNative';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Label } from '../components/ui/label';

// ── Mobile-only helpers ───────────────────────────────────────────────────────
const getMobileInp = (resolvedTheme: 'light' | 'dark'): React.CSSProperties => ({
  width: '100%', padding: '14px 16px', borderRadius: 14,
  border: resolvedTheme === 'light' ? '1.5px solid rgba(0,0,0,0.1)' : '1.5px solid rgba(255,255,255,0.1)',
  background: resolvedTheme === 'light' ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.06)',
  color: resolvedTheme === 'light' ? '#1e293b' : '#f1f5f9',
  fontSize: 16, outline: 'none', boxSizing: 'border-box',
  fontFamily: 'system-ui,-apple-system,sans-serif',
  WebkitAppearance: 'none',
});
function MobileFieldLabel({ children, resolvedTheme }: { children: React.ReactNode; resolvedTheme: 'light' | 'dark' }) {
  return <label style={{ display: 'block', fontSize: 11, fontWeight: 700,
    color: resolvedTheme === 'light' ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.45)', letterSpacing: '0.1em', textTransform: 'uppercase',
    marginBottom: 7, fontFamily: 'system-ui,sans-serif' }}>{children}</label>;
}
function Spinner({ resolvedTheme }: { resolvedTheme: 'light' | 'dark' }) {
  return <div style={{ width: 18, height: 18, borderRadius: '50%',
    border: `2px solid ${resolvedTheme === 'light' ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.3)'}`,
    borderTopColor: resolvedTheme === 'light' ? '#1e293b' : '#fff',
    animation: 'authSpin 0.7s linear infinite', flexShrink: 0 }} />;
}

export function AuthPage() {
  const isNative = useIsNative();
  const { resolvedTheme } = useTheme();
  const [isSignUp, setIsSignUp] = useState(false);
  const [loginTab, setLoginTab] = useState<'owner' | 'employee'>('owner');
  const [mode, setMode] = useState<'auth' | 'forgot' | 'reset'>('auth');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneCountryCode, setPhoneCountryCode] = useState('+91');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpChannel] = useState<'both'>('both');
  const [apiEditOpen, setApiEditOpen] = useState(false);
  const [apiDraft, setApiDraft] = useState('');
  const apiOverrideActive = !!getApiUrlOverride();
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [checkingBackend, setCheckingBackend] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);
  const [clickCount, setClickCount] = useState(0);
  const { signIn, signUp, signInAsEmployee, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
        try {
      const raw = localStorage.getItem('currentProfile');
      if (raw) { const p = typeof raw === 'string' ? JSON.parse(raw) : raw; if (p?.id) { navigate('/dashboard', { replace: true }); return; } }
    } catch {}
    navigate('/profiles', { replace: true });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    let cancelled = false;
    let failCount = 0;
    const check = async () => {
      setCheckingBackend(true);
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 15000);
        // Cache buster + high-fidelity check
        const url = `${getApiUrl().replace(/\/$/, '')}/health?t=${Date.now()}`;
        const res = await fetch(url, { 
          signal: ctrl.signal,
          headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
        });
        clearTimeout(t);
        if (!cancelled) {
          setBackendOnline(res.ok);
          if (res.ok) failCount = 0;
          else failCount++;
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error("[Auth] Health check failed:", err.message);
          setBackendOnline(false);
          failCount++;
        }
      } finally {
        if (!cancelled) setCheckingBackend(false);
      }
    };

    // Initial delay to allow network hardware to stabilize on app boot
    const initTimer = setTimeout(() => void check(), 1000);
    const id = setInterval(check, 15000); // More frequent checks initially (15s)
    
    return () => { 
      cancelled = true; 
      clearTimeout(initTimer);
      clearInterval(id); 
    };
  }, []);

  useEffect(() => { if (apiEditOpen) setApiDraft(getApiUrl()); }, [apiEditOpen]);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const handleLogoClick = () => {
    const now = Date.now();
    setClickCount(prev => {
      const next = prev + 1;
      if (next >= 5) {
        setApiEditOpen(true);
        return 0;
      }
      return next;
    });
    // Reset count after 2s of inactivity
    setTimeout(() => setClickCount(0), 2000);
  };

  if (user) {
    return (
      <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: resolvedTheme === 'light' ? '#f8fafc' : '#0f172a' }}>
        <div onClick={handleLogoClick} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: 'linear-gradient(135deg,#6366f1,#818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          </div>
          <span style={{ fontSize: 22, fontWeight: 700, color: '#818cf8', fontFamily: 'system-ui,sans-serif' }}>BillVyapar</span>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (loginTab === 'employee') {
        await signInAsEmployee(email, password);
        toast.success('Signed in as employee!');
        navigate('/employee/attendance', { replace: true }); return;
      }
      if (mode === 'forgot') {
        const r = await fetch(`${API_URL}/auth/forgot-password`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, channel: otpChannel }) });
        if (!r.ok) {
          const d = await r.json().catch(() => ({}));
          throw new Error(d.error || d.detail || `Server error: ${r.status}`);
        }
        toast.success('OTP sent (if account exists)');
        setMode('reset'); setLoading(false); return;
      }
      if (mode === 'reset') {
        const r = await fetch(`${API_URL}/auth/reset-password`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, otp, newPassword }) });
        if (!r.ok) {
          const d = await r.json().catch(() => ({}));
          throw new Error(d.error || d.detail || `Server error: ${r.status}`);
        }
        toast.success('Password reset successful. Please sign in.');
        setMode('auth'); setIsSignUp(false); setPassword(''); setNewPassword(''); setOtp('');
        setLoading(false); return;
      }
      if (isSignUp) {
        if (!name.trim()) { toast.error('Please enter your name'); setLoading(false); return; }
        if (!phone.trim()) { toast.error('Please enter your phone number'); setLoading(false); return; }
        const digits = phone.replace(/\D/g, '');
        await signUp(email, password, name, `${phoneCountryCode}${digits}`);
        toast.success('Account created successfully!');
        navigate('/profiles', { replace: true }); return;
      }
      await signIn(email, password);
      toast.success('Signed in successfully!');
      try {
        const raw = localStorage.getItem('currentProfile');
        if (raw) { const p = typeof raw === 'string' ? JSON.parse(raw) : raw; if (p?.id) { navigate('/dashboard', { replace: true }); return; } }
      } catch {}
      try {
        const tok = localStorage.getItem('accessToken');
        const did = localStorage.getItem('deviceId') || '';
        const res = await fetch(`${API_URL}/profiles`, { headers: { Authorization: `Bearer ${tok}`, 'X-Device-ID': did } });
        const profiles = await res.json();
        if (Array.isArray(profiles) && profiles.length > 0) { localStorage.setItem('currentProfile', JSON.stringify(profiles[0])); navigate('/dashboard', { replace: true }); return; }
      } catch {}
      navigate('/profiles', { replace: true });
    } catch (err: any) {
      if (err?.code === 'ALREADY_LOGGED_IN_ANOTHER_DEVICE') { toast.error('Already opened on another device. Reset password to continue.'); setMode('forgot'); }
      else toast.error(err.message || 'Authentication failed');
    } finally { setLoading(false); }
  };

  // ── WEB layout (original parchment design) ────────────────────────────────
  const statusColor = backendOnline ? '#22c55e' : backendOnline === false ? '#ef4444' : '#f59e0b';
  const statusText = checkingBackend && backendOnline === null ? 'Connecting…'
    : backendOnline ? 'Online' : backendOnline === false && checkingBackend ? 'Reconnecting…'
    : backendOnline === false ? 'Offline' : '…';

  const webInputStyle: React.CSSProperties = {
    width: '100%', padding: '11px 14px', borderRadius: 6,
    border: '1px solid rgba(0,0,0,0.15)', background: 'rgba(255,255,255,0.55)',
    color: '#1a1a14', fontSize: 14, fontFamily: 'Manrope, sans-serif',
    outline: 'none', transition: 'background 0.2s, border-color 0.2s',
    backdropFilter: 'blur(4px)', boxSizing: 'border-box',
  };

  const title = mode === 'auth'
    ? (loginTab === 'employee' ? 'Employee Login' : isSignUp ? 'Create Account' : 'Welcome Back')
    : mode === 'forgot' ? 'Forgot Password' : 'Reset Password';
  const subtitle = mode === 'auth'
    ? (loginTab === 'employee' ? 'Sign in with your employee credentials' : isSignUp ? 'Start managing your business' : 'Sign in to your dashboard')
    : mode === 'forgot' ? 'Enter your email to receive an OTP' : 'Enter the OTP and your new password';
  const btnLabel = loading ? 'Please wait…'
    : mode === 'forgot' ? 'Send OTP' : mode === 'reset' ? 'Reset Password'
    : loginTab === 'employee' ? 'Sign In as Employee' : isSignUp ? 'Create Account' : 'Sign In';

  if (isNative) {
    // ── NATIVE UI (Clean, Theme-Aware Design) ────────────────────────────────
    return (
      <div style={{
        position: 'fixed', inset: 0,
        backgroundColor: resolvedTheme === 'light' ? '#f8fafc' : '#0f172a',
        display: 'flex', flexDirection: 'column',
        fontFamily: 'system-ui, sans-serif',
        overflow: 'auto',
        padding: '20px'
      }}>
        {/* Status indicator (top right) - Only green dot */}
        <div onClick={handleLogoClick} style={{
          position: 'absolute', top: 'calc(env(safe-area-inset-top, 0px) + 16px)',
          right: 16, display: 'flex', alignItems: 'center', gap: 6,
          background: resolvedTheme === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)', 
          padding: '6px 10px', borderRadius: 20,
          backdropFilter: 'blur(4px)', zIndex: 10
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor }} />
        </div>

        {/* Developer Settings Modal */}
        {apiEditOpen && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)',
            zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20
          }}>
            <div style={{ background: resolvedTheme === 'light' ? '#ffffff' : '#1e293b', width: '100%', maxWidth: 400, borderRadius: 16, padding: 24, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)' }}>
              <h3 style={{ color: resolvedTheme === 'light' ? '#1e293b' : '#fff', fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Developer Settings</h3>

              <div style={{ marginBottom: 20 }}>
                <Label style={{ color: resolvedTheme === 'light' ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.6)', fontSize: 12, display: 'block', marginBottom: 8 }}>API SERVER URL</Label>
                <input
                  type="text"
                  value={apiDraft}
                  onChange={e => setApiDraft(e.target.value)}
                  placeholder="https://api.example.com"
                  style={{
                    width: '100%', background: resolvedTheme === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)', border: resolvedTheme === 'light' ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8, padding: '12px', color: resolvedTheme === 'light' ? '#1e293b' : '#fff', fontSize: 14, outline: 'none'
                  }}
                />
                <p style={{ color: resolvedTheme === 'light' ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 8 }}>
                  Current: <span style={{ color: '#818cf8' }}>{getApiUrl()}</span>
                  <br />
                  Hint: Point to <span style={{ color: '#fbbf24' }}>http://192.168.83.31:4000</span> for local testing.
                </p>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  type="button"
                  onClick={() => {
                    if (apiDraft.trim()) {
                      setApiUrlOverride(apiDraft);
                      window.location.reload();
                    }
                  }}
                  style={{ flex: 1, background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 8, padding: '12px', fontWeight: 600 }}
                >
                  Save & Reload
                </button>
                <button
                  type="button"
                  onClick={() => {
                    clearApiUrlOverride();
                    window.location.reload();
                  }}
                  style={{ flex: 1, background: resolvedTheme === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)', color: resolvedTheme === 'light' ? '#1e293b' : '#fff', border: 'none', borderRadius: 8, padding: '12px', fontWeight: 600 }}
                >
                  Reset Default
                </button>
              </div>
              <button
                type="button"
                onClick={() => setApiEditOpen(false)}
                style={{ width: '100%', marginTop: 12, background: 'transparent', color: resolvedTheme === 'light' ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)', border: 'none', padding: '8px', fontSize: 13 }}
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div style={{ 
          flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center',
          maxWidth: 400, margin: '0 auto', width: '100%'
        }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ 
              width: 64, height: 64, borderRadius: 16, 
              background: 'linear-gradient(135deg,#6366f1,#818cf8)', 
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 12
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
            </div>
            <h1 style={{ 
              fontSize: 28, fontWeight: 800, 
              color: resolvedTheme === 'light' ? '#1e293b' : '#f1f5f9',
              margin: 0, marginBottom: 4
            }}>BillVyapar</h1>
            <p style={{ 
              fontSize: 14, 
              color: resolvedTheme === 'light' ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)',
              margin: 0
            }}>Business Billing & Documentation</p>
          </div>

          {/* Tab Switcher */}
          {mode === 'auth' && !isSignUp && (
            <div style={{ 
              display: 'flex', 
              background: resolvedTheme === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)', 
              borderRadius: 12, padding: 4, marginBottom: 24, gap: 4 
            }}>
              <button 
                type="button" 
                onClick={() => setLoginTab('owner')}
                style={{ 
                  flex: 1, padding: '10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  fontWeight: 600, fontSize: 14, transition: 'all 0.2s',
                  background: loginTab === 'owner' ? (resolvedTheme === 'light' ? '#fff' : 'rgba(255,255,255,0.1)') : 'transparent',
                  color: loginTab === 'owner' ? (resolvedTheme === 'light' ? '#1e293b' : '#fff') : (resolvedTheme === 'light' ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)'),
                  boxShadow: loginTab === 'owner' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                Owner
              </button>
              <button 
                type="button" 
                onClick={() => setLoginTab('employee')}
                style={{ 
                  flex: 1, padding: '10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  fontWeight: 600, fontSize: 14, transition: 'all 0.2s',
                  background: loginTab === 'employee' ? (resolvedTheme === 'light' ? '#fff' : 'rgba(255,255,255,0.1)') : 'transparent',
                  color: loginTab === 'employee' ? (resolvedTheme === 'light' ? '#1e293b' : '#fff') : (resolvedTheme === 'light' ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)'),
                  boxShadow: loginTab === 'employee' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                Employee
              </button>
            </div>
          )}

          {/* Title */}
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ 
              fontSize: 22, fontWeight: 700, 
              color: resolvedTheme === 'light' ? '#1e293b' : '#f1f5f9',
              margin: 0, marginBottom: 4
            }}>{title}</h2>
            <p style={{ 
              fontSize: 14, 
              color: resolvedTheme === 'light' ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)',
              margin: 0
            }}>{subtitle}</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {mode === 'auth' && isSignUp && (
              <>
                <div>
                  <MobileFieldLabel resolvedTheme={resolvedTheme}>Full Name</MobileFieldLabel>
                  <input 
                    type="text" 
                    placeholder="John Doe" 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    required
                    style={getMobileInp(resolvedTheme)} 
                  />
                </div>
                <div>
                  <MobileFieldLabel resolvedTheme={resolvedTheme}>Phone Number</MobileFieldLabel>
                  <input 
                    type="tel" 
                    placeholder="+91 99999 99999" 
                    value={phone} 
                    onChange={e => setPhone(e.target.value)} 
                    required
                    style={getMobileInp(resolvedTheme)} 
                  />
                </div>
              </>
            )}

            <div>
              <MobileFieldLabel resolvedTheme={resolvedTheme}>Email</MobileFieldLabel>
              <input 
                type="email" 
                placeholder="you@example.com" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                required
                style={getMobileInp(resolvedTheme)} 
              />
            </div>

            {mode !== 'forgot' && (
              <div>
                <MobileFieldLabel resolvedTheme={resolvedTheme}>Password</MobileFieldLabel>
                <div style={{ position: 'relative' }}>
                  <input 
                    type={showPass ? 'text' : 'password'} 
                    placeholder="••••••••" 
                    value={mode === 'reset' ? newPassword : password} 
                    onChange={e => mode === 'reset' ? setNewPassword(e.target.value) : setPassword(e.target.value)} 
                    required
                    style={getMobileInp(resolvedTheme)} 
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPass(!showPass)}
                    style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', 
                      color: resolvedTheme === 'light' ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.4)',
                      fontSize: 12, fontWeight: 600, cursor: 'pointer'
                    }}
                  >
                    {showPass ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
            )}

            {mode === 'reset' && (
              <div>
                <MobileFieldLabel resolvedTheme={resolvedTheme}>OTP</MobileFieldLabel>
                <input 
                  type="text" 
                  placeholder="Enter OTP" 
                  value={otp} 
                  onChange={e => setOtp(e.target.value)} 
                  required
                  style={getMobileInp(resolvedTheme)} 
                />
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              style={{
                marginTop: 8, padding: 16, borderRadius: 12, border: 'none',
                background: 'linear-gradient(135deg, #6366f1, #818cf8)', 
                color: '#fff',
                fontWeight: 700, fontSize: 16, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? <Spinner resolvedTheme={resolvedTheme} /> : btnLabel}
            </button>

            {/* Links */}
            <div style={{ 
              display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8,
              alignItems: 'center'
            }}>
              {mode === 'auth' && !isSignUp && (
                <button 
                  type="button" 
                  onClick={() => setMode('forgot')}
                  style={{
                    background: 'none', border: 'none', 
                    color: resolvedTheme === 'light' ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)',
                    fontSize: 14, fontWeight: 600, textDecoration: 'underline',
                    cursor: 'pointer'
                  }}
                >
                  Forgot Password?
                </button>
              )}
              {mode === 'auth' && !isSignUp && loginTab === 'owner' && (
                <button 
                  type="button" 
                  onClick={() => setIsSignUp(true)}
                  style={{
                    background: 'none', border: 'none', 
                    color: resolvedTheme === 'light' ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)',
                    fontSize: 14, fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Don't have an account? <span style={{ textDecoration: 'underline' }}>Sign Up</span>
                </button>
              )}
              {(mode === 'forgot' || mode === 'reset' || isSignUp) && (
                <button 
                  type="button" 
                  onClick={() => { setMode('auth'); setIsSignUp(false); }}
                  style={{
                    background: 'none', border: 'none', 
                    color: resolvedTheme === 'light' ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)',
                    fontSize: 14, fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  ← Back to Sign In
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ── WEB layout (original parchment design) ────────────────────────────────

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', fontFamily: 'Manrope, sans-serif', backgroundImage: 'url("background.png")', backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: '#2a3a5c', overflowY: 'auto', width: '100vw', height: '100vh', maxWidth: 'none' }}>

      {/* Fullscreen button */}
      <button type="button" title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        onClick={() => isFullscreen ? document.exitFullscreen?.().catch(()=>{}) : document.documentElement.requestFullscreen?.().catch(()=>{})}
        style={{ position: 'fixed', bottom: 16, right: 16, zIndex: 200, background: 'rgba(0,0,0,0.35)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, padding: '8px', cursor: 'pointer', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.7 }}>
        {isFullscreen
          ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/><path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/></svg>
          : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7V3h4"/><path d="M17 3h4v4"/><path d="M21 17v4h-4"/><path d="M7 21H3v-4"/></svg>}
      </button>

      <nav style={{ position: 'sticky', top: 0, zIndex: 50, background: 'transparent' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'Newsreader, serif', fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: '-0.3px', textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>BillVyapar</span>
          <button type="button" onClick={() => { setMode('auth'); setIsSignUp(false); }} style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.35)', borderRadius: 999, padding: '7px 20px', fontWeight: 600, fontSize: 14, cursor: 'pointer', backdropFilter: 'blur(8px)' }}>Sign In</button>
        </div>
      </nav>

      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(16px,4vw,32px) 16px' }}>
        <div style={{ width: '100%', maxWidth: 500, background: 'rgba(255,252,240,0.55)', backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)', borderRadius: 4, border: '1px solid rgba(255,255,255,0.18)', boxShadow: '0 8px 40px rgba(0,0,0,0.18)', padding: 'clamp(20px,5vw,36px) clamp(16px,6vw,44px)', position: 'relative' }}>

          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div onClick={handleLogoClick} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 60, height: 60, borderRadius: 14, background: 'linear-gradient(135deg,#4f7df3,#2350db)', boxShadow: '0 4px 16px rgba(31,78,216,0.35)', marginBottom: 10, cursor: 'pointer' }}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            </div>
            <h1 onClick={handleLogoClick} style={{ fontFamily: 'Newsreader, serif', fontSize: 'clamp(22px,6vw,30px)', fontWeight: 700, color: '#1a1a14', margin: 0, letterSpacing: '-0.3px', cursor: 'pointer' }}>BillVyapar+{apiOverrideActive ? ' (DEV)' : ''}</h1>
            <p style={{ fontFamily: 'Newsreader, serif', fontStyle: 'italic', fontSize: 14, color: '#4a4a3a', margin: '4px 0 0' }}>Business Billing &amp; Documentation</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 14 }}>
              {[{label:'GST Invoices',rot:'-1deg'},{label:'Multi-Business',rot:'2deg'},{label:'Offline Ready',rot:'-2deg'}].map(({label,rot}) => (
                <span key={label} style={{ padding: '3px 11px', background: 'rgba(255,255,255,0.45)', color: '#3a3a2a', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', borderRadius: 999, border: '1px solid rgba(0,0,0,0.12)', transform: `rotate(${rot})`, display: 'inline-block' }}>{label}</span>
              ))}
            </div>
          </div>

          {/* Tabs */}
          {mode === 'auth' && (
            <div style={{ display: 'flex', background: 'rgba(0,0,0,0.06)', borderRadius: 8, padding: 3, marginBottom: 20, gap: 2 }}>
              {(['owner','employee'] as const).map(tab => (
                <button key={tab} type="button" onClick={() => { if (tab === 'employee') { navigate('/employee/login'); return; } setLoginTab(tab); setIsSignUp(false); }}
                  style={{ flex: 1, padding: '8px 0', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, fontFamily: 'Manrope, sans-serif', transition: 'all 0.15s', background: loginTab === tab ? 'rgba(255,255,255,0.9)' : 'transparent', color: loginTab === tab ? '#1a1a14' : '#6a6a5a', boxShadow: loginTab === tab ? '0 1px 4px rgba(0,0,0,0.12)' : 'none' }}>
                  {tab === 'owner' ? '🏢 Owner / Business' : '👤 Employee'}
                </button>
              ))}
            </div>
          )}

          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <h2 style={{ fontFamily: 'Newsreader, serif', fontSize: 22, fontWeight: 600, color: '#1a1a14', margin: 0 }}>{title}</h2>
            <p style={{ fontSize: 13, color: '#5a5a4a', margin: '3px 0 0' }}>{subtitle}</p>
          </div>

          {/* API status — read only, no click */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 14, fontSize: 11, color: '#6a6a5a' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: statusColor, display: 'inline-block' }} />
              {statusText}
            </span>
          </div>


          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {mode === 'auth' && isSignUp && loginTab === 'owner' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#4a4a3a' }}>Full Name</label>
                <input type="text" placeholder="Your full name" value={name} onChange={e => setName(e.target.value)} required style={webInputStyle} />
              </div>
            )}
            {mode === 'auth' && isSignUp && loginTab === 'owner' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#4a4a3a' }}>Phone</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <select value={phoneCountryCode} onChange={e => setPhoneCountryCode(e.target.value)} style={{ ...webInputStyle, width: 'auto', minWidth: 80 }} aria-label="Country code">
                    {['+91','+1','+44','+61','+971','+65','+60','+49','+33','+81','+86','+7','+55','+27','+92','+880','+94','+977'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input type="tel" inputMode="numeric" placeholder="Phone number" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g,'').slice(0,15))} required style={{ ...webInputStyle, flex: 1 }} />
                </div>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#4a4a3a' }}>Email address</label>
              <input type="email" placeholder="name@company.com" value={email} onChange={e => setEmail(e.target.value)} required style={webInputStyle} />
            </div>
            {mode === 'forgot' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', background: 'rgba(59,110,245,0.08)', borderRadius: 6, border: '1px solid rgba(59,110,245,0.18)' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#3b6ef5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                <span style={{ fontSize: 12, color: '#3b6ef5', fontWeight: 600 }}>OTP will be sent to your email address</span>
              </div>
            )}
            {mode === 'auth' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#4a4a3a' }}>Password</label>
                  {!isSignUp && loginTab === 'owner' && <button type="button" onClick={() => setMode('forgot')} style={{ fontSize: 12, fontWeight: 600, color: '#2350db', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Forgot password?</button>}
                </div>
                <div style={{ position: 'relative' }}>
                  <input type={showPass ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} autoComplete={isSignUp ? 'new-password' : 'current-password'} style={{ ...webInputStyle, paddingRight: 40 }} />
                  <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 40, border: 'none', background: 'none', cursor: 'pointer', color: '#6a6a5a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {showPass 
                      ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    }
                  </button>
                </div>
              </div>
            )}
            {mode === 'reset' && (<>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#4a4a3a' }}>OTP</label>
                <input type="text" placeholder="Enter OTP" value={otp} onChange={e => setOtp(e.target.value)} required style={webInputStyle} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#4a4a3a' }}>New Password</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPass ? 'text' : 'password'} placeholder="New password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={6} autoComplete="new-password" style={{ ...webInputStyle, paddingRight: 40 }} />
                  <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 40, border: 'none', background: 'none', cursor: 'pointer', color: '#6a6a5a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {showPass 
                      ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    }
                  </button>
                </div>
              </div>
            </>)}
            <button type="submit" disabled={loading} style={{ width: '100%', padding: '13px', marginTop: 4, background: loading ? 'rgba(100,120,200,0.4)' : 'linear-gradient(90deg,#3b6ef5,#5585ff)', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer', boxShadow: loading ? 'none' : '0 4px 16px rgba(59,110,245,0.4)', fontFamily: 'Manrope, sans-serif', letterSpacing: '0.02em' }}>{btnLabel}</button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {mode !== 'auth' && <button type="button" onClick={() => setMode('auth')} style={{ fontSize: 13, fontWeight: 600, color: '#2350db', background: 'none', border: 'none', cursor: 'pointer' }}>← Back to sign in</button>}
            {loginTab === 'owner' && <p style={{ fontSize: 13, color: '#4a4a3a', margin: 0 }}>{isSignUp ? 'Already have an account? ' : "Don't have an account? "}<button type="button" onClick={() => { setMode('auth'); setIsSignUp(!isSignUp); }} style={{ fontFamily: 'Newsreader, serif', fontStyle: 'italic', fontWeight: 700, color: '#2350db', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}>{isSignUp ? 'Sign in' : 'Sign up'}</button></p>}
            {loginTab === 'employee' && <p style={{ fontSize: 12, color: '#6a6a5a', margin: 0 }}>Contact your employer if you forgot your password</p>}
          </div>

          <div style={{ position: 'absolute', bottom: -24, right: -24, opacity: 0.15, pointerEvents: 'none', transform: 'rotate(12deg)' }}>
            <div style={{ border: '4px solid #77574d', padding: '12px 14px', borderRadius: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontFamily: 'Newsreader, serif', fontSize: 26, fontWeight: 900, color: '#77574d', letterSpacing: '-1px', lineHeight: 1 }}>VERIFIED</span>
              <span style={{ fontSize: 8, fontWeight: 700, color: '#77574d', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Official Ledger Entry</span>
            </div>
          </div>
        </div>
      </main>

      <footer style={{ background: 'transparent' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '16px', display: 'flex', justifyContent: 'center' }}>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', margin: 0, textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>© 2025 BillVyapar</p>
        </div>
      </footer>
    </div>
  );
}
