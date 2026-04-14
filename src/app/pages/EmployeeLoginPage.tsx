import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { API_URL, clearApiUrlOverride, getApiUrlOverride, setApiUrlOverride } from '../config/api';
import { toast } from 'sonner';
import { useIsNative } from '../hooks/useIsNative';


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

  const webInputStyle: React.CSSProperties = {
    width: '100%', padding: '11px 14px', borderRadius: 6,
    border: '1px solid rgba(0,0,0,0.15)', background: 'rgba(255,255,255,0.55)',
    color: '#1a1a14', fontSize: 14, fontFamily: 'Manrope, sans-serif',
    outline: 'none', transition: 'background 0.2s, border-color 0.2s',
    backdropFilter: 'blur(4px)', boxSizing: 'border-box',
  };

  const statusColor = backendOnline ? '#22c55e' : backendOnline === false ? '#ef4444' : '#f59e0b';
  const statusText = backendOnline ? 'Online' : backendOnline === false ? 'Offline' : '…';

  if (isNative) {
    return (
      <div style={{
        position: 'fixed', inset: 0,
        backgroundImage: 'url("mobile_auth_bg.png"), linear-gradient(160deg, #070a14 0%, #1e293b 100%)',
        backgroundSize: 'cover', backgroundPosition: 'center',
        fontFamily: 'system-ui,-apple-system,sans-serif',
        overflow: 'hidden',
      }}>
        {/* Animated Background Glows */}
        <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '60%', height: '40%', background: 'rgba(59,130,246,0.12)', filter: 'blur(100px)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '60%', height: '40%', background: 'rgba(34,197,94,0.12)', filter: 'blur(100px)', borderRadius: '50%' }} />

        {/* Dark overlay */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(15,23,42,0.5) 0%, rgba(15,23,42,0.9) 100%)' }} />

        <style>{`
          @keyframes empSpin{to{transform:rotate(360deg)}}
          @keyframes empPulse { 0% { transform: scale(1); opacity: 0.8; } 50% { transform: scale(1.05); opacity: 1; } 100% { transform: scale(1); opacity: 0.8; } }
        `}</style>

        {/* Status */}
        <div style={{
          position: 'absolute', top: 'calc(env(safe-area-inset-top,0px) + 12px)', right: 16,
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'rgba(255,255,255,0.08)', padding: '6px 12px', borderRadius: 20,
          backdropFilter: 'blur(12px)', zIndex: 10,
          border: '1px solid rgba(255,255,255,0.12)',
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor, boxShadow: `0 0 8px ${statusColor}`, flexShrink: 0 }} />
          <span style={{ fontSize: 9, fontWeight: 900, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{statusText}</span>
        </div>

        {/* Content */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 28px' }}>
          
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ display: 'inline-flex', width: 80, height: 80, borderRadius: 28,
              background: 'linear-gradient(135deg,#3b82f6,#2dd4bf)',
              alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 15px 35px rgba(59,130,246,0.4), inset 0 0 0 1px rgba(255,255,255,0.3)',
              marginBottom: 16 }}>
              <FingerprintIcon />
            </div>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, color: '#fff', letterSpacing: '-0.5px' }}>Staff Portal</h1>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.45)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Secure Attendance Access</p>
          </div>

          {/* Card */}
          <div style={{
            background: 'rgba(255,255,255,0.06)',
            backdropFilter: 'blur(32px)',
            borderRadius: 32,
            padding: '36px 24px',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 30px 60px -12px rgba(0,0,0,0.6)',
          }}>
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ position: 'relative' }}>
                <input type="email" placeholder="Employee Email" value={email}
                  onChange={e => setEmail(e.target.value)} required 
                  style={{ width: '100%', padding: '17px 20px', borderRadius: 18, border: '1.5px solid rgba(255,255,255,0.08)',
                    background: 'rgba(255,255,255,0.04)', color: '#fff', fontSize: 16, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ position: 'relative' }}>
                <input type={showPass ? 'text' : 'password'} placeholder="Access Password" value={password}
                  onChange={e => setPassword(e.target.value)} required
                  style={{ width: '100%', padding: '17px 20px', borderRadius: 18, border: '1.5px solid rgba(255,255,255,0.08)',
                    background: 'rgba(255,255,255,0.04)', color: '#fff', fontSize: 16, outline: 'none', boxSizing: 'border-box' }} />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 11, fontWeight: 800 }}>
                  {showPass ? 'HIDE' : 'SHOW'}
                </button>
              </div>

              <button type="submit" disabled={loading}
                style={{ width: '100%', padding: '18px', borderRadius: 20, border: 'none', marginTop: 10,
                  background: loading ? 'rgba(59,130,246,0.5)' : 'linear-gradient(135deg,#3b82f6,#2563eb)',
                  color: '#fff', fontWeight: 900, fontSize: 16, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  boxShadow: loading ? 'none' : '0 12px 24px rgba(37,99,235,0.4)',
                  transition: 'all 0.3s' }}>
                {loading ? <div style={{ width: 20, height: 20, border: '2.5px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'empSpin 0.6s linear infinite' }} /> : 'Sign In Now'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: 28 }}>
              <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                🏢 Switch to Owner Login
              </button>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: 32 }}>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontWeight: 600, letterSpacing: '0.02em' }}>© 2026 BillVyapar · Enterprise Security</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', fontFamily: 'Manrope, sans-serif', backgroundImage: 'url("background.png")', backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: '#2a3a5c', overflowY: 'auto', width: '100vw', height: '100vh', maxWidth: 'none' }}>
      
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(16px,4vw,32px) 16px' }}>
        <div style={{ width: '100%', maxWidth: 500, background: 'rgba(255,252,240,0.55)', backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)', borderRadius: 4, border: '1px solid rgba(255,255,255,0.18)', boxShadow: '0 8px 40px rgba(0,0,0,0.18)', padding: 'clamp(20px,5vw,36px) clamp(16px,6vw,44px)', position: 'relative' }}>

          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 60, height: 60, borderRadius: 14, background: 'linear-gradient(135deg,#3b6ef5,#5585ff)', boxShadow: '0 4px 16px rgba(59,110,245,0.35)', marginBottom: 10 }}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><circle cx="12" cy="11" r="2.5" fill="white" stroke="none" opacity="0.7"/><line x1="12" y1="13.5" x2="12" y2="16" strokeWidth="2.5"/></svg>
            </div>
            <h1 style={{ fontFamily: 'Newsreader, serif', fontSize: 'clamp(22px,6vw,30px)', fontWeight: 700, color: '#1a1a14', margin: 0, letterSpacing: '-0.3px' }}>Employee Portal</h1>
            <p style={{ fontFamily: 'Newsreader, serif', fontStyle: 'italic', fontSize: 14, color: '#4a4a3a', margin: '4px 0 0' }}>BillVyapar · Staff Access</p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 14, fontSize: 11, color: '#6a6a5a' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: statusColor, display: 'inline-block' }} />
              {statusText}
            </span>
          </div>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#4a4a3a' }}>Email address</label>
              <input type="email" placeholder="name@company.com" value={email} onChange={e => setEmail(e.target.value)} required style={webInputStyle} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#4a4a3a' }}>Password</label>
              </div>
              <div style={{ position: 'relative' }}>
                <input type={showPass ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} style={{ ...webInputStyle, paddingRight: 40 }} />
                <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 40, border: 'none', background: 'none', cursor: 'pointer', color: '#6a6a5a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {showPass 
                    ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  }
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} style={{ width: '100%', padding: '13px', marginTop: 4, background: loading ? 'rgba(79,70,229,0.4)' : 'linear-gradient(90deg,#4f46e5,#7c3aed)', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer', boxShadow: loading ? 'none' : '0 4px 16px rgba(79,70,229,0.4)', fontFamily: 'Manrope, sans-serif', letterSpacing: '0.02em' }}>
              {loading ? 'Please wait…' : 'Sign In'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 18 }}>
            <p style={{ fontSize: 12, color: '#6a6a5a', margin: 0 }}>Forgot your password? Contact your employer.</p>
          </div>

          <div style={{ position: 'absolute', bottom: -24, right: -24, opacity: 0.15, pointerEvents: 'none', transform: 'rotate(12deg)' }}>
            <div style={{ border: '4px solid #77574d', padding: '12px 14px', borderRadius: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontFamily: 'Newsreader, serif', fontSize: 26, fontWeight: 900, color: '#77574d', letterSpacing: '-1px', lineHeight: 1 }}>VERIFIED</span>
              <span style={{ fontSize: 8, fontWeight: 700, color: '#77574d', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Staff Identity</span>
            </div>
          </div>
        </div>
      </main>

      <footer style={{ background: 'transparent' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '16px', display: 'flex', justifyContent: 'center' }}>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', margin: 0, textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>© 2026 BillVyapar</p>
        </div>
      </footer>
    </div>
  );
}
