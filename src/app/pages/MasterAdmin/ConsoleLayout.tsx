import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router';
import {
  LayoutDashboard, Users, UserCircle, Key, BarChart3, ScrollText,
  ShieldCheck, LogOut, ChevronRight, Bell, X, Command,
  AlertTriangle, Clock, Zap, Settings, Menu,
} from 'lucide-react';
import { ADMIN_API_URL as API_URL } from '../../config/api';

const NAV = [
  { group: 'Overview', items: [
    { path: '/dashboard',      label: 'Dashboard',      icon: LayoutDashboard, c: '#6366f1', bg: '#eef2ff' },
    { path: '/data',           label: 'Analytics',      icon: BarChart3,       c: '#0ea5e9', bg: '#e0f2fe' },
    { path: '/audit',          label: 'Audit Logs',     icon: ScrollText,      c: '#8b5cf6', bg: '#ede9fe' },
  ]},
  { group: 'Customers', items: [
    { path: '/subscribers',    label: 'Subscribers',    icon: Users,           c: '#10b981', bg: '#d1fae5' },
    { path: '/users',          label: 'All Users',      icon: UserCircle,      c: '#06b6d4', bg: '#cffafe' },
  ]},
  { group: 'Licensing', items: [
    { path: '/license-keys',   label: 'License Keys',   icon: Key,             c: '#f59e0b', bg: '#fef3c7' },
  ]},
  { group: 'Admin', items: [
    { path: '/admin-accounts', label: 'Admin Accounts', icon: ShieldCheck,     c: '#f43f5e', bg: '#ffe4e6' },
  ]},
];

const CMD_ITEMS = [
  { label: 'Dashboard',      action: '/dashboard',      icon: LayoutDashboard },
  { label: 'Analytics',      action: '/data',           icon: BarChart3 },
  { label: 'Audit Logs',     action: '/audit',          icon: ScrollText },
  { label: 'Subscribers',    action: '/subscribers',    icon: Users },
  { label: 'All Users',      action: '/users',          icon: UserCircle },
  { label: 'License Keys',   action: '/license-keys',   icon: Key },
  { label: 'Admin Accounts', action: '/admin-accounts', icon: ShieldCheck },
];

interface Props { children: React.ReactNode }

export function ConsoleLayout({ children }: Props) {
  const navigate = useNavigate();
  const loc      = useLocation();
  const [sideOpen, setSideOpen] = useState(true);
  const [cmd,  setCmd]  = useState(false);
  const [q,    setQ]    = useState('');
  const [qi,   setQi]   = useState(0);
  const [notif, setNotif] = useState(false);
  const [alerts, setAlerts] = useState({ e7: 0, e30: 0 });
  const cmdRef = useRef<HTMLInputElement>(null);
  const admin  = JSON.parse(localStorage.getItem('masterAdmin') || '{}');

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setCmd(v => !v); }
      if (e.key === 'Escape') { setCmd(false); setNotif(false); setSideOpen(prev => { if (window.innerWidth < 768) return false; return prev; }); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  useEffect(() => { if (cmd) setTimeout(() => cmdRef.current?.focus(), 50); }, [cmd]);

  useEffect(() => {
    const t = localStorage.getItem('masterAdminToken');
    if (!t) return;
    fetch(`${API_URL}/master-admin/dashboard/stats`, { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.json())
      .then(d => { if (!d.error) setAlerts({ e7: d.expiringIn7Days || 0, e30: d.expiringIn30Days || 0 }); })
      .catch(() => {});
  }, [loc.pathname]);

  // close sidebar on route change on mobile
  useEffect(() => {
    if (window.innerWidth < 768) setSideOpen(false);
  }, [loc.pathname]);

  const logout = () => {
    localStorage.removeItem('masterAdminToken');
    localStorage.removeItem('masterAdmin');
    navigate('/');
  };

  const filtered    = CMD_ITEMS.filter(c => c.label.toLowerCase().includes(q.toLowerCase()));
  const totalAlerts = alerts.e7 + alerts.e30;
  const current     = NAV.flatMap(g => g.items).find(i =>
    loc.pathname === i.path || (i.path !== '/dashboard' && loc.pathname.startsWith(i.path))
  );

  return (
    <div className="flex h-screen overflow-hidden"
      style={{ background: 'linear-gradient(135deg,#f0f4ff 0%,#faf5ff 50%,#f0fdf4 100%)' }}>

      {/* ── Backdrop (mobile only) ── */}
      {sideOpen && (
        <div
          className="fixed inset-0 z-[30] md:hidden"
          style={{ background: 'rgba(15,23,42,0.35)', backdropFilter: 'blur(2px)' }}
          onClick={() => setSideOpen(false)}
        />
      )}

      {/* ══════════ SIDEBAR ══════════ */}
      <aside
        className="flex-shrink-0 h-full z-[20] relative"
        style={{
          width: sideOpen ? 240 : 0,
          minWidth: 0,
          overflow: 'hidden',
          transition: 'width 280ms cubic-bezier(.4,0,.2,1)',
          background: 'rgba(255,255,255,0.82)',
          backdropFilter: 'blur(24px)',
          borderRight: sideOpen ? '1.5px solid rgba(255,255,255,0.9)' : 'none',
          boxShadow: sideOpen ? '6px 0 32px rgba(99,102,241,0.1)' : 'none',
        }}
      >
        {/* Inner wrapper — fixed 240px so content doesn't squish during animation */}
        <div className="flex flex-col h-full" style={{ width: 240 }}>

        {/* Brand row */}
        <div className="flex items-center gap-3 h-16 px-4 flex-shrink-0"
          style={{ borderBottom: '1.5px solid rgba(99,102,241,0.08)' }}>
          <div className="w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 4px 14px rgba(99,102,241,0.4)' }}>
            <Zap className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold leading-none tracking-tight" style={{ color: '#1e1b4b' }}>Bill Vyapar</p>
            <p className="text-[10px] mt-0.5 font-semibold" style={{ color: '#6366f1' }}>Admin Console</p>
          </div>
          {/* close button inside sidebar */}
          <button onClick={() => setSideOpen(false)}
            className="p-1.5 rounded-xl transition-all flex-shrink-0"
            style={{ color: '#a5b4fc' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#eef2ff'; (e.currentTarget as HTMLElement).style.color = '#6366f1'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#a5b4fc'; }}>
            <X style={{ width: 15, height: 15 }} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
          {NAV.map(g => (
            <div key={g.group}>
              <p className="px-2 mb-2 text-[9px] font-black tracking-widest uppercase" style={{ color: '#a5b4fc' }}>{g.group}</p>
              <div className="space-y-0.5">
                {g.items.map(item => {
                  const active = loc.pathname === item.path ||
                    (item.path !== '/dashboard' && loc.pathname.startsWith(item.path));
                  return (
                    <button key={item.path}
                      onClick={() => navigate(item.path)}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-2xl text-sm font-semibold transition-all duration-150"
                      style={{
                        background: active ? item.bg : 'transparent',
                        color: active ? item.c : '#64748b',
                        border: active ? `1.5px solid ${item.c}25` : '1.5px solid transparent',
                        boxShadow: active ? `0 4px 12px ${item.c}18` : 'none',
                      }}
                      onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.06)'; (e.currentTarget as HTMLElement).style.color = '#4f46e5'; } }}
                      onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#64748b'; } }}
                    >
                      <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: active ? `${item.c}18` : 'transparent' }}>
                        <item.icon style={{ color: active ? item.c : 'currentColor', width: 15, height: 15 }} />
                      </div>
                      <span className="flex-1 text-left">{item.label}</span>
                      {active && <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" style={{ color: item.c }} />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="flex-shrink-0 px-3 py-3" style={{ borderTop: '1.5px solid rgba(99,102,241,0.08)' }}>
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-2xl mb-2"
            style={{ background: 'linear-gradient(135deg,#eef2ff,#ede9fe)', border: '1.5px solid rgba(99,102,241,0.12)' }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff' }}>
              {(admin.name || admin.email || 'A')[0].toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold truncate" style={{ color: '#1e1b4b' }}>{admin.name || admin.email?.split('@')[0] || 'Admin'}</p>
              <p className="text-[10px] capitalize font-medium truncate" style={{ color: '#6366f1' }}>{admin.role?.replace('_', ' ') || 'admin'}</p>
            </div>
            <Settings style={{ width: 13, height: 13, color: '#a5b4fc', flexShrink: 0 }} />
          </div>
          <button onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
            style={{ color: '#94a3b8' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#f43f5e'; (e.currentTarget as HTMLElement).style.background = '#fff1f2'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#94a3b8'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
            <LogOut style={{ width: 13, height: 13 }} />Sign out
          </button>
        </div>
        </div>{/* end inner 240px wrapper */}
      </aside>

      {/* ══════════ MAIN AREA ══════════ */}
      <div className="flex flex-col flex-1 min-w-0 h-screen overflow-hidden">

        {/* Topbar */}
        <header className="h-16 flex-shrink-0 flex items-center justify-between px-4 md:px-6 relative z-[10]"
          style={{
            background: 'rgba(255,255,255,0.78)',
            backdropFilter: 'blur(20px)',
            borderBottom: '1.5px solid rgba(255,255,255,0.9)',
            boxShadow: '0 2px 16px rgba(99,102,241,0.06)',
          }}>

          {/* Left: hamburger + breadcrumb */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSideOpen(v => !v)}
              className="p-2 rounded-xl transition-all"
              style={{ color: '#64748b' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#eef2ff'; (e.currentTarget as HTMLElement).style.color = '#6366f1'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#64748b'; }}
              aria-label="Toggle sidebar"
            >
              <Menu style={{ width: 18, height: 18 }} />
            </button>

            <div className="flex items-center gap-1.5 text-sm">
              <span className="hidden sm:inline" style={{ color: '#94a3b8' }}>Console</span>
              <ChevronRight className="hidden sm:block" style={{ width: 12, height: 12, color: '#cbd5e1' }} />
              <span className="font-bold" style={{ color: '#1e1b4b' }}>{current?.label || 'Dashboard'}</span>
            </div>
          </div>

          {/* Right: search + notif + live */}
          <div className="flex items-center gap-2">
            <button onClick={() => setCmd(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-2xl text-xs font-medium transition-all"
              style={{ background: '#f1f5f9', border: '1.5px solid #e2e8f0', color: '#64748b' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#eef2ff'; (e.currentTarget as HTMLElement).style.borderColor = '#c7d2fe'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#f1f5f9'; (e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0'; }}>
              <Command style={{ width: 13, height: 13 }} />
              <span className="hidden sm:inline">Search</span>
              <kbd className="hidden sm:inline px-1.5 py-0.5 rounded-md text-[10px] font-mono" style={{ background: '#e2e8f0', color: '#94a3b8' }}>⌘K</kbd>
            </button>

            {/* Notifications */}
            <div className="relative">
              <button onClick={() => setNotif(v => !v)}
                className="relative p-2.5 rounded-2xl transition-all"
                style={{ background: '#f1f5f9', border: '1.5px solid #e2e8f0', color: '#64748b' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#eef2ff'; (e.currentTarget as HTMLElement).style.borderColor = '#c7d2fe'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#f1f5f9'; (e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0'; }}>
                <Bell style={{ width: 16, height: 16 }} />
                {totalAlerts > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center"
                    style={{ background: '#f59e0b', color: '#fff', boxShadow: '0 2px 6px rgba(245,158,11,0.4)' }}>
                    {totalAlerts}
                  </span>
                )}
              </button>

              {notif && (
                <div className="absolute right-0 top-14 rounded-3xl z-[40] overflow-hidden"
                  style={{ width: 300, background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(20px)', border: '1.5px solid rgba(255,255,255,0.9)', boxShadow: '0 20px 60px rgba(99,102,241,0.15)' }}>
                  <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1.5px solid #f1f5f9' }}>
                    <p className="text-sm font-bold" style={{ color: '#1e1b4b' }}>Notifications</p>
                    {totalAlerts > 0 && <span className="text-[10px] px-2.5 py-1 rounded-full font-bold" style={{ background: '#fef3c7', color: '#d97706', border: '1px solid #fde68a' }}>{totalAlerts}</span>}
                  </div>
                  <div className="p-3 space-y-2">
                    {totalAlerts === 0 ? (
                      <div className="py-8 text-center">
                        <Bell style={{ width: 28, height: 28, margin: '0 auto 8px', color: '#e2e8f0' }} />
                        <p className="text-xs font-medium" style={{ color: '#94a3b8' }}>No alerts right now</p>
                      </div>
                    ) : (
                      <>
                        {alerts.e7 > 0 && (
                          <div className="flex gap-3 p-3.5 rounded-2xl" style={{ background: '#fffbeb', border: '1.5px solid #fde68a' }}>
                            <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: '#f59e0b' }} />
                            <div>
                              <p className="text-xs font-semibold" style={{ color: '#92400e' }}>{alerts.e7} license{alerts.e7 > 1 ? 's' : ''} expiring in 7 days</p>
                              <button onClick={() => { navigate('/subscribers'); setNotif(false); }} className="text-[10px] mt-0.5 font-medium" style={{ color: '#d97706' }}>View →</button>
                            </div>
                          </div>
                        )}
                        {alerts.e30 > 0 && (
                          <div className="flex gap-3 p-3.5 rounded-2xl" style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe' }}>
                            <Clock className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: '#3b82f6' }} />
                            <div>
                              <p className="text-xs font-semibold" style={{ color: '#1e40af' }}>{alerts.e30} license{alerts.e30 > 1 ? 's' : ''} expiring in 30 days</p>
                              <button onClick={() => { navigate('/subscribers'); setNotif(false); }} className="text-[10px] mt-0.5 font-medium" style={{ color: '#3b82f6' }}>View →</button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5 px-3 py-2 rounded-2xl"
              style={{ background: '#d1fae5', border: '1.5px solid #a7f3d0' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black tracking-widest hidden sm:inline" style={{ color: '#059669' }}>LIVE</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 w-full relative z-[0]">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>

      {/* ══════════ COMMAND PALETTE ══════════ */}
      {cmd && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4"
          onClick={() => setCmd(false)}>
          <div className="absolute inset-0 backdrop-blur-sm" style={{ background: 'rgba(15,23,42,0.4)' }} />
          <div className="relative w-full max-w-md rounded-3xl overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(20px)', border: '1.5px solid rgba(255,255,255,0.9)', boxShadow: '0 32px 80px rgba(99,102,241,0.2)' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: '1.5px solid #f1f5f9' }}>
              <Command style={{ width: 16, height: 16, color: '#a5b4fc', flexShrink: 0 }} />
              <input ref={cmdRef} value={q} onChange={e => { setQ(e.target.value); setQi(0); }}
                onKeyDown={e => {
                  if (e.key === 'ArrowDown') setQi(i => Math.min(i + 1, filtered.length - 1));
                  if (e.key === 'ArrowUp')   setQi(i => Math.max(i - 1, 0));
                  if (e.key === 'Enter' && filtered[qi]) { navigate(filtered[qi].action); setCmd(false); setQ(''); }
                }}
                placeholder="Search pages and actions..."
                className="flex-1 bg-transparent text-sm outline-none font-medium"
                style={{ color: '#1e1b4b' }} />
              <button onClick={() => setCmd(false)} className="p-1 rounded-lg" style={{ color: '#94a3b8' }}>
                <X style={{ width: 15, height: 15 }} />
              </button>
            </div>
            <div className="py-2 max-h-72 overflow-y-auto">
              {filtered.length === 0
                ? <p className="text-center py-8 text-sm font-medium" style={{ color: '#94a3b8' }}>No results</p>
                : filtered.map((item, i) => (
                  <button key={item.action}
                    onClick={() => { navigate(item.action); setCmd(false); setQ(''); }}
                    className="w-full flex items-center gap-3 px-5 py-3 text-left transition-all"
                    style={{ background: i === qi ? '#eef2ff' : 'transparent', color: i === qi ? '#4f46e5' : '#64748b' }}>
                    <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: i === qi ? '#c7d2fe' : '#f1f5f9' }}>
                      <item.icon style={{ width: 14, height: 14, color: i === qi ? '#4f46e5' : '#94a3b8' }} />
                    </div>
                    <span className="text-sm font-semibold">{item.label}</span>
                  </button>
                ))}
            </div>
            <div className="px-5 py-3 flex items-center gap-4" style={{ borderTop: '1.5px solid #f1f5f9', background: '#fafafa' }}>
              {[['↑↓','nav'],['↵','open'],['Esc','close']].map(([k, v]) => (
                <span key={k} className="flex items-center gap-1.5 text-[10px] font-medium" style={{ color: '#94a3b8' }}>
                  <kbd className="px-1.5 py-0.5 rounded-lg font-mono text-[10px]" style={{ background: '#e2e8f0', color: '#64748b' }}>{k}</kbd>{v}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
