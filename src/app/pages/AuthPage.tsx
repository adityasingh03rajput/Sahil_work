import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { FileText } from 'lucide-react';
import { API_URL, clearApiUrlOverride, getApiUrlOverride, setApiUrlOverride } from '../config/api';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Label } from '../components/ui/label';

export function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [loginTab, setLoginTab] = useState<'owner' | 'employee'>('owner');
  const [mode, setMode] = useState<'auth' | 'forgot' | 'reset'>('auth');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneCountryCode, setPhoneCountryCode] = useState('+91');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpChannel, setOtpChannel] = useState<'sms' | 'email' | 'both'>('sms');
  const [apiEditOpen, setApiEditOpen] = useState(false);
  const [apiDraft, setApiDraft] = useState('');
  const apiOverrideActive = !!getApiUrlOverride();
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [checkingBackend, setCheckingBackend] = useState(false);
  const { signIn, signUp, signInAsEmployee, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    try {
      const raw = localStorage.getItem('currentProfile');
      if (raw) {
        const profile = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (profile?.id) { navigate('/dashboard', { replace: true }); return; }
      }
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
      } catch {
        if (!cancelled) setBackendOnline(false);
      } finally {
        if (!cancelled) setCheckingBackend(false);
      }
    };
    void check();
    const id = setInterval(check, 30000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  useEffect(() => {
    if (apiEditOpen) setApiDraft(API_URL);
  }, [apiEditOpen]);

  // Force full-screen: remove any max-width constraints from html/body/#root
  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'auth-fullscreen';
    style.textContent = `
      html, body, #root {
        width: 100% !important;
        max-width: none !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: hidden !important;
      }
    `;
    document.head.appendChild(style);
    return () => { document.getElementById('auth-fullscreen')?.remove(); };
  }, []);

  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const requestFullscreen = () => {
    document.documentElement.requestFullscreen?.().catch(() => {});
  };

  const exitFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  };

  if (authLoading) {
    return (
      <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fdf9f0' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <FileText style={{ width: 48, height: 48, color: '#1f4ed8', animation: 'pulse 1.5s infinite' }} />
          <span style={{ fontSize: 22, fontWeight: 700, fontFamily: 'Newsreader, serif', color: '#1c1c17' }}>BillVyapar</span>
        </div>
      </div>
    );
  }

  if (user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Employee login path
      if (loginTab === 'employee') {
        await signInAsEmployee(email, password);
        toast.success('Signed in as employee!');
        navigate('/employee/attendance', { replace: true });
        return;
      }

      if (mode === 'forgot') {
        const response = await fetch(`${API_URL}/auth/forgot-password`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, channel: otpChannel }),
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        toast.success('OTP sent (if account exists)');
        setMode('reset'); setLoading(false); return;
      }
      if (mode === 'reset') {
        const response = await fetch(`${API_URL}/auth/reset-password`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, otp, newPassword }),
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        toast.success('Password reset successful. Please sign in.');
        setMode('auth'); setIsSignUp(false); setPassword(''); setNewPassword(''); setOtp('');
        setLoading(false); return;
      }
      if (isSignUp) {
        if (!name.trim()) { toast.error('Please enter your name'); setLoading(false); return; }
        if (!phone.trim()) { toast.error('Please enter your phone number'); setLoading(false); return; }
        const normalizePhone = (raw: string) => {
          const v = String(raw || '').trim();
          if (!v) return v;
          const digits = v.replace(/\D/g, '');
          return `${phoneCountryCode}${digits}`;
        };
        await signUp(email, password, name, normalizePhone(phone));
        toast.success('Account created successfully!');
        navigate('/welcome', { replace: true }); return;
      } else {
        await signIn(email, password);
        toast.success('Signed in successfully!');
      }
      try {
        const raw = localStorage.getItem('currentProfile');
        if (raw) {
          const profile = typeof raw === 'string' ? JSON.parse(raw) : raw;
          if (profile?.id) { navigate('/dashboard', { replace: true }); return; }
        }
      } catch {}
      try {
        const tok = localStorage.getItem('accessToken');
        const did = localStorage.getItem('deviceId') || '';
        const res = await fetch(`${API_URL}/profiles`, {
          headers: { Authorization: `Bearer ${tok}`, 'X-Device-ID': did },
        });
        const profiles = await res.json();
        if (Array.isArray(profiles) && profiles.length > 0) {
          localStorage.setItem('currentProfile', JSON.stringify(profiles[0]));
          navigate('/dashboard', { replace: true }); return;
        }
      } catch {}
      navigate('/welcome', { replace: true });
    } catch (error: any) {
      if (error?.code === 'ALREADY_LOGGED_IN_ANOTHER_DEVICE') {
        toast.error('Already opened on another device. Reset password to continue.');
        setMode('forgot');
      } else {
        toast.error(error.message || 'Authentication failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const statusColor = backendOnline ? '#22c55e' : backendOnline === false ? '#ef4444' : '#f59e0b';
  const statusText = checkingBackend && backendOnline === null ? 'Connecting…'
    : backendOnline ? 'Online' : backendOnline === false && checkingBackend ? 'Reconnecting…'
    : backendOnline === false ? 'Offline' : '…';

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '11px 14px',
    borderRadius: 6,
    border: '1px solid rgba(0,0,0,0.15)',
    background: 'rgba(255,255,255,0.55)',
    color: '#1a1a14',
    fontSize: 14,
    fontFamily: 'Manrope, sans-serif',
    outline: 'none',
    transition: 'background 0.2s, border-color 0.2s',
    backdropFilter: 'blur(4px)',
    boxSizing: 'border-box',
  };

  const title = mode === 'auth'
    ? (loginTab === 'employee' ? 'Employee Login' : isSignUp ? 'Create Account' : 'Welcome Back')
    : mode === 'forgot' ? 'Forgot Password' : 'Reset Password';

  const subtitle = mode === 'auth'
    ? (loginTab === 'employee' ? 'Sign in with your employee credentials'
      : isSignUp ? 'Start managing your business' : 'Sign in to your dashboard')
    : mode === 'forgot' ? 'Enter your email to receive an OTP'
    : 'Enter the OTP and your new password';

  const btnLabel = loading ? 'Please wait…'
    : mode === 'forgot' ? 'Send OTP'
    : mode === 'reset' ? 'Reset Password'
    : loginTab === 'employee' ? 'Sign In as Employee'
    : isSignUp ? 'Create Account' : 'Sign In';

  return (
    <div style={{
      position: 'fixed', inset: 0,
      display: 'flex', flexDirection: 'column',
      fontFamily: 'Manrope, sans-serif',
      backgroundImage: 'url(/background.png)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      overflowY: 'auto',
      width: '100vw',
      height: '100vh',
      maxWidth: 'none',
    }}>

      {/* Fullscreen corner button */}
      <button
        type="button"
        title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        onClick={isFullscreen ? exitFullscreen : requestFullscreen}
        style={{
          position: 'fixed', bottom: 16, right: 16, zIndex: 200,
          background: 'rgba(0,0,0,0.35)', color: '#fff',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: 8, padding: '8px', cursor: 'pointer',
          backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: 0.7, transition: 'opacity 0.2s',
        }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '0.7')}
      >
        {isFullscreen ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/>
            <path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/>
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7V3h4"/><path d="M17 3h4v4"/><path d="M21 17v4h-4"/><path d="M7 21H3v-4"/>
          </svg>
        )}
      </button>

      {/* Nav — fully transparent */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, background: 'transparent' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '14px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'Newsreader, serif', fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: '-0.3px', textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>BillVyapar</span>
          <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
            {['Features', 'Pricing', 'About'].map(l => (
              <a key={l} href="#" style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: 500, textDecoration: 'none', textShadow: '0 1px 3px rgba(0,0,0,0.4)' }}>{l}</a>
            ))}
            <button
              type="button"
              onClick={() => { setMode('auth'); setIsSignUp(false); }}
              style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.35)', borderRadius: 999, padding: '7px 20px', fontWeight: 600, fontSize: 14, cursor: 'pointer', backdropFilter: 'blur(8px)' }}
            >
              Sign In
            </button>
          </div>
        </div>
      </nav>

      {/* Main — no extra overlay, background shows through */}
      <main style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
      }}>
        {/* Card — glass over the open book */}
        <div style={{
          width: '100%', maxWidth: 500,
          background: 'rgba(255,252,240,0.55)',
          backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)',
          borderRadius: 4,
          border: '1px solid rgba(255,255,255,0.18)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
          padding: '36px 44px',
          position: 'relative',
        }}>

          {/* Logo block */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            {/* Icon */}
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg, #4f7df3, #2350db)', boxShadow: '0 4px 16px rgba(31,78,216,0.35)', marginBottom: 12 }}>
              <FileText style={{ width: 26, height: 26, color: '#fff' }} />
            </div>
            <h1 style={{ fontFamily: 'Newsreader, serif', fontSize: 30, fontWeight: 700, color: '#1a1a14', margin: 0, letterSpacing: '-0.3px' }}>BillVyapar</h1>
            <p style={{ fontFamily: 'Newsreader, serif', fontStyle: 'italic', fontSize: 14, color: '#4a4a3a', margin: '4px 0 0' }}>Business Billing &amp; Documentation</p>
            {/* Feature tags */}
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 14 }}>
              {[{ label: 'GST Invoices', rot: '-1deg' }, { label: 'Multi-Business', rot: '2deg' }, { label: 'Offline Ready', rot: '-2deg' }].map(({ label, rot }) => (
                <span key={label} style={{
                  padding: '3px 11px', background: 'rgba(255,255,255,0.45)', color: '#3a3a2a',
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                  borderRadius: 999, border: '1px solid rgba(0,0,0,0.12)', transform: `rotate(${rot})`,
                  display: 'inline-block',
                }}>{label}</span>
              ))}
            </div>
          </div>

          {/* Login type tabs */}
          {mode === 'auth' && (
            <div style={{ display: 'flex', background: 'rgba(0,0,0,0.06)', borderRadius: 8, padding: 3, marginBottom: 20, gap: 2 }}>
              {(['owner', 'employee'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => {
                    if (tab === 'employee') {
                      navigate('/employee/login');
                      return;
                    }
                    setLoginTab(tab);
                    setIsSignUp(false);
                  }}
                  style={{
                    flex: 1, padding: '8px 0', borderRadius: 6, border: 'none', cursor: 'pointer',
                    fontWeight: 600, fontSize: 13, fontFamily: 'Manrope, sans-serif',
                    transition: 'all 0.15s',
                    background: loginTab === tab ? 'rgba(255,255,255,0.9)' : 'transparent',
                    color: loginTab === tab ? '#1a1a14' : '#6a6a5a',
                    boxShadow: loginTab === tab ? '0 1px 4px rgba(0,0,0,0.12)' : 'none',
                  }}
                >
                  {tab === 'owner' ? '🏢 Owner / Business' : '👤 Employee'}
                </button>
              ))}
            </div>
          )}

          {/* Form heading */}
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <h2 style={{ fontFamily: 'Newsreader, serif', fontSize: 22, fontWeight: 600, color: '#1a1a14', margin: 0 }}>{title}</h2>
            <p style={{ fontSize: 13, color: '#5a5a4a', margin: '3px 0 0' }}>{subtitle}</p>
          </div>

          {/* API status bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, fontSize: 11, color: '#6a6a5a' }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '65%' }}>
              {API_URL}{apiOverrideActive ? ' (custom)' : ''}
              {!apiEditOpen && (
                <button type="button" style={{ marginLeft: 4, color: '#1f4ed8', background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, textDecoration: 'underline', padding: 0 }}
                  onClick={() => setApiEditOpen(true)}>edit</button>
              )}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: statusColor, display: 'inline-block' }} />
              {statusText}
            </span>
          </div>

          {apiEditOpen && (
            <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
              <input value={apiDraft} onChange={e => setApiDraft(e.target.value)} placeholder="https://your-backend.com"
                style={{ flex: 1, padding: '7px 10px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.15)', background: 'rgba(255,255,255,0.5)', fontSize: 12, color: '#1a1a14', outline: 'none' }} />
              <button type="button" onClick={() => { const n = setApiUrlOverride(apiDraft); toast.success(`API → ${n}`); window.location.reload(); }}
                style={{ padding: '7px 12px', borderRadius: 6, background: '#3b6ef5', color: '#fff', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Save</button>
              <button type="button" onClick={() => setApiEditOpen(false)}
                style={{ padding: '7px 10px', borderRadius: 6, background: 'rgba(0,0,0,0.1)', color: '#3a3a2a', border: 'none', fontSize: 12, cursor: 'pointer' }}>✕</button>
              <button type="button" onClick={() => { clearApiUrlOverride(); toast.success('Reset'); window.location.reload(); }}
                style={{ padding: '7px 10px', borderRadius: 6, background: 'rgba(0,0,0,0.1)', color: '#3a3a2a', border: 'none', fontSize: 12, cursor: 'pointer' }}>Reset</button>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {mode === 'auth' && isSignUp && loginTab === 'owner' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#4a4a3a' }}>Full Name</label>
                <input type="text" placeholder="Your full name" value={name} onChange={e => setName(e.target.value)} required style={inputStyle} />
              </div>
            )}

            {mode === 'auth' && isSignUp && loginTab === 'owner' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#4a4a3a' }}>Phone</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <select value={phoneCountryCode} onChange={e => setPhoneCountryCode(e.target.value)}
                    style={{ ...inputStyle, width: 'auto', minWidth: 80 }} aria-label="Country code">
                    {['+91','+1','+44','+61','+971','+65','+60','+49','+33','+81','+86','+7','+55','+27','+92','+880','+94','+977'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <input type="tel" inputMode="numeric" placeholder="Phone number" value={phone}
                    onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 15))} required
                    style={{ ...inputStyle, flex: 1 }} />
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#4a4a3a' }}>Email address</label>
              <input type="email" placeholder="name@company.com" value={email} onChange={e => setEmail(e.target.value)} required style={inputStyle} />
            </div>

            {mode === 'forgot' && (
              <div>
                <p style={{ fontSize: 12, color: '#747686', marginBottom: 8 }}>Send OTP via</p>
                <RadioGroup value={otpChannel} onValueChange={v => setOtpChannel(v as any)} className="flex gap-4">
                  {(['sms', 'email', 'both'] as const).map(v => (
                    <div key={v} className="flex items-center gap-1.5">
                      <RadioGroupItem value={v} id={`otp-${v}`} />
                      <Label htmlFor={`otp-${v}`} style={{ fontSize: 12, color: '#434655', textTransform: 'capitalize' }}>{v}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            )}

            {mode === 'auth' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#4a4a3a' }}>Password</label>
                  {!isSignUp && loginTab === 'owner' && (
                    <button type="button" onClick={() => setMode('forgot')}
                      style={{ fontSize: 12, fontWeight: 600, color: '#2350db', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                      Forgot password?
                    </button>
                  )}                </div>
                <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
                  autoComplete={isSignUp ? 'new-password' : 'current-password'} style={inputStyle} />
              </div>
            )}

            {mode === 'reset' && (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#4a4a3a' }}>OTP</label>
                  <input type="text" placeholder="Enter OTP" value={otp} onChange={e => setOtp(e.target.value)} required style={inputStyle} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#4a4a3a' }}>New Password</label>
                  <input type="password" placeholder="New password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={6}
                    autoComplete="new-password" style={inputStyle} />
                </div>
              </>
            )}

            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '13px', marginTop: 4,
              background: loading ? 'rgba(100,120,200,0.4)' : 'linear-gradient(90deg, #3b6ef5, #5585ff)',
              color: '#fff', border: 'none', borderRadius: 6,
              fontWeight: 700, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading ? 'none' : '0 4px 16px rgba(59,110,245,0.4)',
              transition: 'transform 0.15s, box-shadow 0.15s',
              fontFamily: 'Manrope, sans-serif',
              letterSpacing: '0.02em',
            }}>
              {btnLabel}
            </button>
          </form>

          {/* Footer links */}
          <div style={{ textAlign: 'center', marginTop: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {mode !== 'auth' && (
              <button type="button" onClick={() => setMode('auth')}
                style={{ fontSize: 13, fontWeight: 600, color: '#2350db', background: 'none', border: 'none', cursor: 'pointer' }}>
                ← Back to sign in
              </button>
            )}
            {loginTab === 'owner' && (
              <p style={{ fontSize: 13, color: '#4a4a3a', margin: 0 }}>
                {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
                <button type="button" onClick={() => { setMode('auth'); setIsSignUp(!isSignUp); }}
                  style={{ fontFamily: 'Newsreader, serif', fontStyle: 'italic', fontWeight: 700, color: '#2350db', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}>
                  {isSignUp ? 'Sign in' : 'Sign up'}
                </button>
              </p>
            )}
            {loginTab === 'employee' && (
              <p style={{ fontSize: 12, color: '#6a6a5a', margin: 0 }}>
                Contact your employer if you forgot your password
              </p>
            )}
          </div>

          {/* Decorative stamp */}
          <div style={{ position: 'absolute', bottom: -24, right: -24, opacity: 0.15, pointerEvents: 'none', transform: 'rotate(12deg)' }}>
            <div style={{ border: '4px solid #77574d', padding: '12px 14px', borderRadius: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontFamily: 'Newsreader, serif', fontSize: 26, fontWeight: 900, color: '#77574d', letterSpacing: '-1px', lineHeight: 1 }}>VERIFIED</span>
              <span style={{ fontSize: 8, fontWeight: 700, color: '#77574d', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Official Ledger Entry</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer — transparent */}
      <footer style={{ background: 'transparent' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '16px 32px', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 12 }}>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', margin: 0, textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>© 2025 BillVyapar</p>
        </div>
      </footer>
    </div>
  );
}
