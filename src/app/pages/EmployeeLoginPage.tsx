import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { API_URL, clearApiUrlOverride, getApiUrlOverride, setApiUrlOverride } from '../config/api';
import { toast } from 'sonner';

// Fingerprint / lock icon as inline SVG — no extra dep
function ShieldIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <circle cx="12" cy="11" r="2.5" fill="currentColor" stroke="none" opacity="0.7" />
      <line x1="12" y1="13.5" x2="12" y2="16" strokeWidth="2.5" />
    </svg>
  );
}

export function EmployeeLoginPage() {
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

  // Redirect if already logged in as employee
  useEffect(() => {
    if (authLoading) return;
    if (user?.userType === 'employee') {
      navigate('/employee/attendance', { replace: true });
    }
  }, [user, authLoading, navigate]);

  // Backend health ping
  useEffect(() => {
    let cancelled = false;
    const ping = async () => {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 15000);
        const res = await fetch(`${API_URL}/health`, { signal: ctrl.signal });
        clearTimeout(t);
        if (!cancelled) setBackendOnline(res.ok);
      } catch {
        if (!cancelled) setBackendOnline(false);
      }
    };
    void ping();
    const id = setInterval(ping, 30000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  useEffect(() => {
    if (apiEditOpen) setApiDraft(API_URL);
  }, [apiEditOpen]);

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
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div style={{
        position: 'fixed', inset: 0,
        background: 'linear-gradient(160deg, #0f172a 0%, #1e1b4b 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: 16,
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: 16,
          background: 'linear-gradient(135deg, #6366f1, #818cf8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 32px rgba(99,102,241,0.5)',
          animation: 'pulse 1.5s ease-in-out infinite',
        }}>
          <ShieldIcon />
        </div>
        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, fontFamily: 'system-ui, sans-serif' }}>
          Loading…
        </span>
      </div>
    );
  }

  const statusDot = backendOnline === true ? '#4ade80'
    : backendOnline === false ? '#f87171' : '#fbbf24';

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'linear-gradient(160deg, #0f172a 0%, #1e1b4b 60%, #0f172a 100%)',
      display: 'flex', flexDirection: 'column',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      overflowY: 'auto',
    }}>

      {/* Safe area top spacer */}
      <div style={{ height: 'env(safe-area-inset-top, 24px)' }} />

      {/* Decorative blobs */}
      <div style={{
        position: 'absolute', top: -80, right: -80,
        width: 280, height: 280, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: 80, left: -60,
        width: 200, height: 200, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Main content */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '24px 24px',
        position: 'relative', zIndex: 1,
      }}>

        {/* Logo / brand */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 22,
            background: 'linear-gradient(135deg, #6366f1, #818cf8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 8px 32px rgba(99,102,241,0.45)',
            color: 'white',
          }}>
            <ShieldIcon />
          </div>
          <h1 style={{
            fontSize: 26, fontWeight: 800, color: '#fff',
            margin: 0, letterSpacing: '-0.5px',
          }}>
            Employee Portal
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: '6px 0 0' }}>
            BillVyapar · Staff Access
          </p>
        </div>

        {/* Card */}
        <div style={{
          width: '100%', maxWidth: 380,
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 24,
          padding: '28px 24px',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
        }}>

          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>
            Sign In
          </h2>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: '0 0 24px' }}>
            Use your employee credentials
          </p>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Email */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Email
              </label>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  padding: '13px 16px',
                  borderRadius: 12,
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'rgba(255,255,255,0.07)',
                  color: '#fff',
                  fontSize: 15,
                  outline: 'none',
                  width: '100%',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => (e.target.style.borderColor = 'rgba(99,102,241,0.7)')}
                onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.12)')}
              />
            </div>

            {/* Password */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  style={{
                    padding: '13px 48px 13px 16px',
                    borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.12)',
                    background: 'rgba(255,255,255,0.07)',
                    color: '#fff',
                    fontSize: 15,
                    outline: 'none',
                    width: '100%',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = 'rgba(99,102,241,0.7)')}
                  onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.12)')}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  style={{
                    position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'rgba(255,255,255,0.4)', padding: 0, lineHeight: 1,
                    fontSize: 12, fontWeight: 600,
                  }}
                >
                  {showPass ? 'HIDE' : 'SHOW'}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: 6,
                padding: '15px',
                borderRadius: 14,
                border: 'none',
                background: loading
                  ? 'rgba(99,102,241,0.4)'
                  : 'linear-gradient(135deg, #6366f1, #818cf8)',
                color: '#fff',
                fontSize: 16,
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : '0 8px 24px rgba(99,102,241,0.45)',
                transition: 'transform 0.1s, box-shadow 0.1s',
                letterSpacing: '0.02em',
                width: '100%',
              }}
              onMouseDown={(e) => { if (!loading) (e.currentTarget.style.transform = 'scale(0.97)'); }}
              onMouseUp={(e) => { (e.currentTarget.style.transform = 'scale(1)'); }}
              onTouchStart={(e) => { if (!loading) (e.currentTarget.style.transform = 'scale(0.97)'); }}
              onTouchEnd={(e) => { (e.currentTarget.style.transform = 'scale(1)'); }}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          {/* Help text */}
          <p style={{ textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.3)', margin: '20px 0 0' }}>
            Forgot your password? Contact your employer.
          </p>
        </div>

        {/* API status + edit */}
        <div style={{ marginTop: 24, width: '100%', maxWidth: 380 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: apiEditOpen ? 8 : 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: statusDot, flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>
                {API_URL}{apiOverrideActive ? ' (custom)' : ''}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setApiEditOpen((v) => !v)}
              style={{ fontSize: 11, color: 'rgba(99,102,241,0.7)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
            >
              {apiEditOpen ? 'close' : 'edit'}
            </button>
          </div>

          {apiEditOpen && (
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                value={apiDraft}
                onChange={(e) => setApiDraft(e.target.value)}
                placeholder="https://your-backend.com"
                style={{
                  flex: 1, padding: '8px 10px', borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: 'rgba(255,255,255,0.07)', color: '#fff',
                  fontSize: 12, outline: 'none',
                }}
              />
              <button
                type="button"
                onClick={() => { setApiUrlOverride(apiDraft); toast.success('API URL saved'); window.location.reload(); }}
                style={{ padding: '8px 12px', borderRadius: 8, background: '#6366f1', color: '#fff', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => { clearApiUrlOverride(); toast.success('Reset'); window.location.reload(); }}
                style={{ padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', fontSize: 12, cursor: 'pointer' }}
              >
                ↺
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Safe area bottom */}
      <div style={{ height: 'env(safe-area-inset-bottom, 16px)' }} />
    </div>
  );
}
