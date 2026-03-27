import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { API_URL, clearApiUrlOverride, getApiUrlOverride, setApiUrlOverride } from '../config/api';
import { useIsNative } from '../hooks/useIsNative';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Label } from '../components/ui/label';

// ── Mobile-only helpers ───────────────────────────────────────────────────────
const mobileInp: React.CSSProperties = {
  width: '100%', padding: '14px 16px', borderRadius: 14,
  border: '1.5px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.06)', color: '#f1f5f9',
  fontSize: 16, outline: 'none', boxSizing: 'border-box',
  fontFamily: 'system-ui,-apple-system,sans-serif',
  WebkitAppearance: 'none',
};
function MobileFieldLabel({ children }: { children: React.ReactNode }) {
  return <label style={{ display: 'block', fontSize: 11, fontWeight: 700,
    color: 'rgba(255,255,255,0.45)', letterSpacing: '0.1em', textTransform: 'uppercase',
    marginBottom: 7, fontFamily: 'system-ui,sans-serif' }}>{children}</label>;
}
function Spinner() {
  return <div style={{ width: 18, height: 18, borderRadius: '50%',
    border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff',
    animation: 'authSpin 0.7s linear infinite', flexShrink: 0 }} />;
}

export function AuthPage() {
  const isNative = useIsNative();
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
  const [otpChannel] = useState<'email'>('email');
  const [apiEditOpen, setApiEditOpen] = useState(false);
  const [apiDraft, setApiDraft] = useState('');
  const apiOverrideActive = !!getApiUrlOverride();
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [checkingBackend, setCheckingBackend] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);
  const { signIn, signUp, signInAsEmployee, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    try {
      const raw = localStorage.getItem('currentProfile');
      if (raw) { const p = typeof raw === 'string' ? JSON.parse(raw) : raw; if (p?.id) { navigate('/dashboard', { replace: true }); return; } }
    } catch {}
    navigate('/welcome', { replace: true });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      setCheckingBackend(true);
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 20000);
        const res = await fetch(`${API_URL}/health`, { signal: ctrl.signal });
        clearTimeout(t);
        if (!cancelled) setBackendOnline(res.ok);
      } catch { if (!cancelled) setBackendOnline(false); }
      finally { if (!cancelled) setCheckingBackend(false); }
    };
    void check();
    const id = setInterval(check, 30000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  useEffect(() => { if (apiEditOpen) setApiDraft(API_URL); }, [apiEditOpen]);

  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'auth-fullscreen';
    style.textContent = `html,body,#root{width:100%!important;max-width:none!important;margin:0!important;padding:0!important;overflow:hidden!important;}`;
    document.head.appendChild(style);
    return () => { document.getElementById('auth-fullscreen')?.remove(); };
  }, []);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  if (user) {
    return (
      <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
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
        const d = await r.json();
        if (d.error) throw new Error(d.error);
        toast.success('OTP sent (if account exists)');
        setMode('reset'); setLoading(false); return;
      }
      if (mode === 'reset') {
        const r = await fetch(`${API_URL}/auth/reset-password`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, otp, newPassword }) });
        const d = await r.json();
        if (d.error) throw new Error(d.error);
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
        navigate('/welcome', { replace: true }); return;
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
      navigate('/welcome', { replace: true });
    } catch (err: any) {
      if (err?.code === 'ALREADY_LOGGED_IN_ANOTHER_DEVICE') { toast.error('Already opened on another device. Reset password to continue.'); setMode('forgot'); }
      else toast.error(err.message || 'Authentication failed');
    } finally { setLoading(false); }
  };

  // ── NATIVE (APK) layout ───────────────────────────────────────────────────
  if (isNative) {
    const statusDot = backendOnline === true ? '#22c55e' : backendOnline === false ? '#ef4444' : '#f59e0b';
    const modeTitle = mode === 'auth' ? (isSignUp ? 'Create Account' : 'Welcome Back') : mode === 'forgot' ? 'Forgot Password' : 'Reset Password';
    const btnLabel = mode === 'forgot' ? 'Send OTP' : mode === 'reset' ? 'Reset Password' : isSignUp ? 'Create Account' : 'Sign In';
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#0d1117', display: 'flex', flexDirection: 'column', overflowY: 'auto', overflowX: 'hidden', fontFamily: 'system-ui,-apple-system,sans-serif', WebkitTapHighlightColor: 'transparent' } as any}>
        <div style={{ position: 'fixed', top: -100, left: -100, width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle,rgba(79,70,229,0.15) 0%,transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
        <div style={{ height: 'env(safe-area-inset-top,20px)' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 20px', position: 'relative', zIndex: 2 }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.3px' }}>BillVyapar</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, border: 'none', borderRadius: 20, padding: '5px 10px', background: 'rgba(255,255,255,0.06)' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: statusDot }} />
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>{backendOnline === true ? 'Online' : backendOnline === false ? 'Offline' : '…'}</span>
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px 20px 0', position: 'relative', zIndex: 2 }}>
          <div style={{ marginBottom: 24, textAlign: 'center' }}>
            <div style={{ width: 80, height: 80, borderRadius: 24, margin: '0 auto 14px', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 12px rgba(79,70,229,0.1), 0 8px 32px rgba(79,70,229,0.4)' }}>
              <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            </div>
            <h1 style={{ margin: '0 0 4px', fontSize: 26, fontWeight: 900, color: '#f1f5f9', letterSpacing: '-0.5px' }}>BillVyapar</h1>
            <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Business Billing & Documentation</p>
          </div>
          {mode === 'auth' && (
            <div style={{ display: 'flex', width: '100%', maxWidth: 400, gap: 8, marginBottom: 20 }}>
              {(['owner', 'employee'] as const).map(tab => (
                <button key={tab} type="button" onClick={() => { if (tab === 'employee') { navigate('/employee/login'); return; } setLoginTab(tab); setIsSignUp(false); }}
                  style={{ flex: 1, padding: '12px 8px', borderRadius: 14, cursor: 'pointer', fontWeight: 700, fontSize: 13, fontFamily: 'system-ui,sans-serif', background: loginTab === tab ? 'linear-gradient(135deg,rgba(79,70,229,0.3),rgba(124,58,237,0.25))' : 'rgba(255,255,255,0.04)', color: loginTab === tab ? '#a5b4fc' : 'rgba(255,255,255,0.4)', outline: loginTab === tab ? '1.5px solid rgba(99,102,241,0.4)' : '1.5px solid rgba(255,255,255,0.07)', border: 'none', transition: 'all 0.15s' }}>
                  {tab === 'owner' ? '🏢 Owner' : '👤 Employee'}
                </button>
              ))}
            </div>
          )}
          <div style={{ width: '100%', maxWidth: 400, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, padding: '24px 20px 20px', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
            <div style={{ width: 32, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.12)', margin: '0 auto 20px' }} />
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ margin: '0 0 3px', fontSize: 20, fontWeight: 800, color: '#f1f5f9' }}>{modeTitle}</h2>
              <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>{mode === 'auth' ? (isSignUp ? 'Start managing your business' : 'Sign in to your dashboard') : mode === 'forgot' ? 'Enter your email to receive an OTP' : 'Enter the OTP and your new password'}</p>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {mode === 'auth' && isSignUp && (<>
                <div><MobileFieldLabel>Full Name</MobileFieldLabel><input type="text" placeholder="Your full name" value={name} onChange={e => setName(e.target.value)} required style={mobileInp} onFocus={e => e.target.style.borderColor='rgba(99,102,241,0.6)'} onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.1)'} /></div>
                <div><MobileFieldLabel>Phone</MobileFieldLabel><div style={{ display: 'flex', gap: 8 }}><select value={phoneCountryCode} onChange={e => setPhoneCountryCode(e.target.value)} style={{ ...mobileInp, width: 'auto', minWidth: 76, padding: '14px 10px' }} aria-label="Country code">{['+91','+1','+44','+61','+971','+65','+60','+49','+33','+81','+86','+7','+55','+27','+92','+880','+94','+977'].map(c => <option key={c} value={c}>{c}</option>)}</select><input type="tel" inputMode="numeric" placeholder="Phone number" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g,'').slice(0,15))} required style={{ ...mobileInp, flex: 1 }} onFocus={e => e.target.style.borderColor='rgba(99,102,241,0.6)'} onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.1)'} /></div></div>
              </>)}
              <div><MobileFieldLabel>Email Address</MobileFieldLabel><input type="email" inputMode="email" autoComplete="email" placeholder="name@company.com" value={email} onChange={e => setEmail(e.target.value)} required style={mobileInp} onFocus={e => e.target.style.borderColor='rgba(99,102,241,0.6)'} onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.1)'} /></div>
              {mode === 'forgot' && (<div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 12, background: 'rgba(79,70,229,0.1)', border: '1px solid rgba(99,102,241,0.25)' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg><span style={{ fontSize: 12, color: '#a5b4fc', fontWeight: 600 }}>OTP will be sent to your email</span></div>)}
              {mode === 'auth' && (<div><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}><MobileFieldLabel>Password</MobileFieldLabel>{!isSignUp && loginTab === 'owner' && <button type="button" onClick={() => setMode('forgot')} style={{ fontSize: 12, fontWeight: 600, color: '#818cf8', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Forgot?</button>}</div><div style={{ position: 'relative' }}><input type={showPass ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} autoComplete={isSignUp ? 'new-password' : 'current-password'} style={{ ...mobileInp, paddingRight: 52 }} onFocus={e => e.target.style.borderColor='rgba(99,102,241,0.6)'} onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.1)'} /><button type="button" onClick={() => setShowPass(v => !v)} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 52, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{showPass ? 'HIDE' : 'SHOW'}</button></div></div>)}
              {mode === 'reset' && (<><div><MobileFieldLabel>OTP Code</MobileFieldLabel><input type="text" inputMode="numeric" placeholder="Enter 4-digit OTP" value={otp} onChange={e => setOtp(e.target.value)} required style={mobileInp} onFocus={e => e.target.style.borderColor='rgba(99,102,241,0.6)'} onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.1)'} /></div><div><MobileFieldLabel>New Password</MobileFieldLabel><input type="password" placeholder="New password (min 6 chars)" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={6} autoComplete="new-password" style={mobileInp} onFocus={e => e.target.style.borderColor='rgba(99,102,241,0.6)'} onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.1)'} /></div></>)}
              <button type="submit" disabled={loading} style={{ width: '100%', height: 54, borderRadius: 16, border: 'none', background: loading ? 'rgba(79,70,229,0.35)' : 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: '#fff', fontSize: 16, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer', boxShadow: loading ? 'none' : '0 8px 28px rgba(79,70,229,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontFamily: 'system-ui,sans-serif', marginTop: 4 }} onTouchStart={e => { if (!loading) e.currentTarget.style.transform='scale(0.97)'; }} onTouchEnd={e => { e.currentTarget.style.transform='scale(1)'; }}>{loading ? <><Spinner />Please wait…</> : btnLabel}</button>
            </form>
            <div style={{ textAlign: 'center', marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {mode !== 'auth' && <button type="button" onClick={() => setMode('auth')} style={{ fontSize: 13, fontWeight: 600, color: '#818cf8', background: 'none', border: 'none', cursor: 'pointer' }}>← Back to sign in</button>}
              {mode === 'auth' && loginTab === 'owner' && <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: 0 }}>{isSignUp ? 'Already have an account? ' : "Don't have an account? "}<button type="button" onClick={() => { setMode('auth'); setIsSignUp(!isSignUp); }} style={{ fontWeight: 700, color: '#818cf8', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}>{isSignUp ? 'Sign in' : 'Sign up'}</button></p>}
            </div>
          </div>
        </div>
        <div style={{ height: 'calc(env(safe-area-inset-bottom,16px) + 24px)' }} />
        <style>{`@keyframes authSpin{to{transform:rotate(360deg)}} input::placeholder{color:rgba(255,255,255,0.2)} input:-webkit-autofill,input:-webkit-autofill:focus{-webkit-box-shadow:0 0 0 100px #1e1b4b inset!important;-webkit-text-fill-color:#f1f5f9!important} select option{background:#1e1b4b;color:#f1f5f9}`}</style>
      </div>
    );
  }

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

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', fontFamily: 'Manrope, sans-serif', backgroundImage: 'url(/background.png)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: '#2a3a5c', overflowY: 'auto', width: '100vw', height: '100vh', maxWidth: 'none' }}>

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
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 60, height: 60, borderRadius: 14, background: 'linear-gradient(135deg,#4f7df3,#2350db)', boxShadow: '0 4px 16px rgba(31,78,216,0.35)', marginBottom: 10 }}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            </div>
            <h1 style={{ fontFamily: 'Newsreader, serif', fontSize: 'clamp(22px,6vw,30px)', fontWeight: 700, color: '#1a1a14', margin: 0, letterSpacing: '-0.3px' }}>BillVyapar</h1>
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

          {/* API status */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, fontSize: 11, color: '#6a6a5a' }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '65%' }}>
              {API_URL}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
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
                <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} autoComplete={isSignUp ? 'new-password' : 'current-password'} style={webInputStyle} />
              </div>
            )}
            {mode === 'reset' && (<>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#4a4a3a' }}>OTP</label>
                <input type="text" placeholder="Enter OTP" value={otp} onChange={e => setOtp(e.target.value)} required style={webInputStyle} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#4a4a3a' }}>New Password</label>
                <input type="password" placeholder="New password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={6} autoComplete="new-password" style={webInputStyle} />
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
