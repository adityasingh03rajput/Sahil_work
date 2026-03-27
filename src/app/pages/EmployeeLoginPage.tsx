import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { API_URL, clearApiUrlOverride, getApiUrlOverride, setApiUrlOverride } from '../config/api';
import { toast } from 'sonner';
import { useIsNative } from '../hooks/useIsNative';

/* ── Animated wave background ─────────────────────────────────────────────── */
function WaveBg() {
  return (
    <svg viewBox="0 0 390 200" preserveAspectRatio="none"
      style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: 220, pointerEvents: 'none' }}>
      <path d="M0,80 C80,140 160,20 260,90 C320,130 360,60 390,80 L390,200 L0,200 Z"
        fill="rgba(99,102,241,0.12)" />
      <path d="M0,110 C60,70 140,150 220,100 C300,50 350,130 390,110 L390,200 L0,200 Z"
        fill="rgba(139,92,246,0.08)" />
    </svg>
  );
}

/* ── Fingerprint icon ─────────────────────────────────────────────────────── */
function FingerprintIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4"/>
      <path d="M14 13.12c0 2.38 0 6.38-1 8.88"/>
      <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02"/>
      <path d="M2 12a10 10 0 0 1 18-6"/>
      <path d="M2 17.5c.5.5 1.5 1.5 3 1.5"/>
      <path d="M20 12c0 1.3-.15 2.6-.43 3.8"/>
      <path d="M6.26 18.67c.94 2.06 2.04 3.4 3.74 4.33"/>
      <path d="M6 10a6 6 0 0 1 11.29-2.1"/>
    </svg>
  );
}

export function EmployeeLoginPage() {
  const isNative = useIsNative();
  const { signInAsEmployee, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [apiEditOpen, setApiEditOpen] = useState(false);
  const [apiDraft, setApiDraft] = useState('');
  const apiOverrideActive = !!getApiUrlOverride();

  useEffect(() => {
    if (authLoading) return;
    if (user?.userType === 'employee') navigate('/employee/attendance', { replace: true });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    let cancelled = false;
    const ping = async () => {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 15000);
        const res = await fetch(`${API_URL}/health`, { signal: ctrl.signal });
        clearTimeout(t);
        if (!cancelled) setBackendOnline(res.ok);
      } catch { if (!cancelled) setBackendOnline(false); }
    };
    void ping();
    const id = setInterval(ping, 30000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  useEffect(() => { if (apiEditOpen) setApiDraft(API_URL); }, [apiEditOpen]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    try {
      await signInAsEmployee(email.trim(), password);
      toast.success('Welcome back!');
      navigate('/employee/attendance', { replace: true });
    } catch (err: any) {
      toast.error(err.message || 'Login failed. Check your credentials.');
    } finally { setLoading(false); }
  };

  if (authLoading) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#0f172a',
        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%',
          border: '3px solid rgba(99,102,241,0.3)', borderTopColor: '#6366f1',
          animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  const statusDot = backendOnline === true ? '#22c55e' : backendOnline === false ? '#ef4444' : '#f59e0b';

  // On web, show a simple clean login page — mobile design is APK-only
  if (!isNative) {
    const webInp: React.CSSProperties = {
      width: '100%', padding: '11px 14px', borderRadius: 8,
      border: '1px solid hsl(var(--border))', background: 'hsl(var(--background))',
      color: 'hsl(var(--foreground))', fontSize: 14, outline: 'none',
      boxSizing: 'border-box', fontFamily: 'system-ui,sans-serif',
    };
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'hsl(var(--background))', padding: 16 }}>
        <div style={{ width: '100%', maxWidth: 400, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 16, padding: '32px 28px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', boxShadow: '0 4px 16px rgba(79,70,229,0.35)' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><circle cx="12" cy="11" r="2.5" fill="white" stroke="none" opacity="0.7"/><line x1="12" y1="13.5" x2="12" y2="16" strokeWidth="2.5"/></svg>
            </div>
            <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800, color: 'hsl(var(--foreground))' }}>Employee Portal</h1>
            <p style={{ margin: 0, fontSize: 13, color: 'hsl(var(--muted-foreground))' }}>BillVyapar · Staff Access</p>
          </div>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'hsl(var(--muted-foreground))', marginBottom: 6 }}>Email</label>
              <input type="email" inputMode="email" autoComplete="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} required style={webInp} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'hsl(var(--muted-foreground))', marginBottom: 6 }}>Password</label>
              <input type="password" autoComplete="current-password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} style={webInp} />
            </div>
            <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', borderRadius: 10, border: 'none', background: loading ? 'rgba(79,70,229,0.4)' : 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: '#fff', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', boxShadow: loading ? 'none' : '0 4px 16px rgba(79,70,229,0.4)' }}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
          <p style={{ textAlign: 'center', fontSize: 12, color: 'hsl(var(--muted-foreground))', margin: '16px 0 0' }}>Forgot your password? Contact your employer.</p>
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid hsl(var(--border))', display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: statusDot, flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{API_URL}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'linear-gradient(175deg, #0f172a 0%, #1e1b4b 45%, #0f172a 100%)',
      display: 'flex', flexDirection: 'column',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      overflowY: 'auto', overflowX: 'hidden',
    }}>
      <WaveBg />

      {/* Safe area top */}
      <div style={{ height: 'env(safe-area-inset-top, 20px)' }} />

      {/* Top strip — status bar area */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
        padding: '10px 20px 0', position: 'relative', zIndex: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5,
          border: 'none', padding: '6px 10px', borderRadius: 20,
          background: 'rgba(255,255,255,0.06)' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: statusDot }} />
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
            {backendOnline === true ? 'Online' : backendOnline === false ? 'Offline' : '…'}
          </span>
        </div>
      </div>

      {/* Hero section */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '20px 24px 0', position: 'relative', zIndex: 2 }}>

        {/* Icon ring */}
        <div style={{ position: 'relative', marginBottom: 28 }}>
          <div style={{
            width: 88, height: 88, borderRadius: 28,
            background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 0 12px rgba(99,102,241,0.12), 0 0 0 24px rgba(99,102,241,0.06)',
          }}>
            <FingerprintIcon />
          </div>
          {/* Online pulse ring */}
          {backendOnline && (
            <div style={{
              position: 'absolute', bottom: 4, right: 4,
              width: 18, height: 18, borderRadius: '50%',
              background: '#22c55e', border: '3px solid #0f172a',
            }} />
          )}
        </div>

        <h1 style={{ margin: '0 0 6px', fontSize: 28, fontWeight: 900, color: '#fff',
          letterSpacing: '-0.5px', textAlign: 'center' }}>
          Employee Portal
        </h1>
        <p style={{ margin: '0 0 36px', fontSize: 14, color: 'rgba(255,255,255,0.4)',
          textAlign: 'center' }}>
          BillVyapar · Staff Access
        </p>

        {/* Form card — bottom-sheet style */}
        <div style={{
          width: '100%', maxWidth: 420,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: 28,
          padding: '28px 24px 24px',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
        }}>
          {/* Drag handle aesthetic */}
          <div style={{ width: 36, height: 4, borderRadius: 2,
            background: 'rgba(255,255,255,0.12)', margin: '0 auto 24px' }} />

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

            {/* Email field */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700,
                color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em',
                textTransform: 'uppercase', marginBottom: 8 }}>
                Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <svg style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                  pointerEvents: 'none', opacity: 0.4 }}
                  width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                <input type="email" inputMode="email" autoComplete="email"
                  placeholder="your@email.com" value={email}
                  onChange={e => setEmail(e.target.value)} required
                  style={{
                    width: '100%', padding: '15px 16px 15px 42px',
                    borderRadius: 14, border: '1.5px solid rgba(255,255,255,0.1)',
                    background: 'rgba(255,255,255,0.06)', color: '#fff',
                    fontSize: 16, outline: 'none', boxSizing: 'border-box',
                    WebkitAppearance: 'none',
                  }}
                  onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.7)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
              </div>
            </div>

            {/* Password field */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700,
                color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em',
                textTransform: 'uppercase', marginBottom: 8 }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <svg style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                  pointerEvents: 'none', opacity: 0.4 }}
                  width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <input type={showPass ? 'text' : 'password'} autoComplete="current-password"
                  placeholder="••••••••" value={password}
                  onChange={e => setPassword(e.target.value)} required minLength={6}
                  style={{
                    width: '100%', padding: '15px 52px 15px 42px',
                    borderRadius: 14, border: '1.5px solid rgba(255,255,255,0.1)',
                    background: 'rgba(255,255,255,0.06)', color: '#fff',
                    fontSize: 16, outline: 'none', boxSizing: 'border-box',
                    WebkitAppearance: 'none',
                  }}
                  onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.7)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  style={{ position: 'absolute', right: 0, top: 0, bottom: 0,
                    width: 52, background: 'none', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'rgba(255,255,255,0.35)', padding: 0 }}>
                  {showPass
                    ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  }
                </button>
              </div>
            </div>

            {/* Submit button */}
            <button type="submit" disabled={loading}
              style={{
                width: '100%', height: 56, borderRadius: 16, border: 'none',
                background: loading
                  ? 'rgba(99,102,241,0.35)'
                  : 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                color: '#fff', fontSize: 17, fontWeight: 800,
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : '0 8px 28px rgba(79,70,229,0.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                letterSpacing: '0.01em',
                WebkitTapHighlightColor: 'transparent',
                transition: 'transform 0.1s, box-shadow 0.1s',
              }}
              onTouchStart={e => { if (!loading) e.currentTarget.style.transform = 'scale(0.97)'; }}
              onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)'; }}>
              {loading ? (
                <>
                  <div style={{ width: 18, height: 18, borderRadius: '50%',
                    border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff',
                    animation: 'spin 0.7s linear infinite' }} />
                  Signing in…
                </>
              ) : 'Sign In'}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.25)',
            margin: '18px 0 0', lineHeight: 1.5 }}>
            Forgot your password?<br />Contact your employer.
          </p>
        </div>


      </div>

      {/* Safe area bottom */}
      <div style={{ height: 'calc(env(safe-area-inset-bottom, 16px) + 24px)' }} />

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder { color: rgba(255,255,255,0.25); }
        input { -webkit-text-fill-color: white; }
        input:-webkit-autofill,
        input:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0 100px #1e1b4b inset !important;
          -webkit-text-fill-color: white !important;
        }
      `}</style>
    </div>
  );
}
