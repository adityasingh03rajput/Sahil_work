/**
 * MobileLayout — refined Android portrait shell.
 *
 * "More" slides up as a bottom sheet with spring-eased CSS transition.
 * Swipe down anywhere on the sheet body dismisses it.
 */

import { ReactNode, useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router';

function usePageTransition() {
  const location = useLocation();
  const [transitioning, setTransitioning] = useState(false);
  const prev = useRef(location.pathname);
  useEffect(() => {
    if (location.pathname === prev.current) return;
    prev.current = location.pathname;
    setTransitioning(true);
    const t = setTimeout(() => setTransitioning(false), 80);
    return () => clearTimeout(t);
  }, [location.pathname]);
  return transitioning;
}

import {
  LayoutDashboard,
  FileText,
  Users,
  BarChart3,
  MoreHorizontal,
  Plus,
  Package,
  Receipt,
  CreditCard,
  Landmark,
  LogOut,
  X,
  AlertCircle,
  ShoppingCart,
  Truck,
  ChevronRight,
  WifiOff,
  UserCog,
  Sun,
  Moon,
  SlidersHorizontal,
} from 'lucide-react';
import logoImg from '../../../public/logo.png';
import { useTheme, type ThemeMode } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { TraceLoader } from './TraceLoader';
import { prefetchRoute } from '../hooks/usePrefetch';

interface MobileLayoutProps {
  children: ReactNode;
  subscriptionWarning: string | null;
  subscriptionExpired: boolean;
  daysRemaining: number | null;
  profileGateChecked: boolean;
}

const PRIMARY_TABS = [
  { icon: LayoutDashboard, label: 'Home',     path: '/dashboard' },
  { icon: FileText,        label: 'Docs',     path: '/documents' },
  { icon: Users,           label: 'Parties',  path: '/customers', matchPrefixes: ['/customers', '/suppliers'] },
  { icon: BarChart3,       label: 'Reports',  path: '/analytics' },
  { icon: MoreHorizontal,  label: 'More',     path: '__more__' },
] as const;

const MORE_ITEMS = [
  { icon: Package,      label: 'Items',        path: '/items' },
  { icon: Receipt,      label: 'GST Reports',  path: '/reports/gst' },
  { icon: CreditCard,   label: 'Ledger',       path: '/ledger' },
  { icon: Landmark,     label: 'Bank',         path: '/bank-accounts' },
  { icon: ShoppingCart, label: 'POS',          path: '/pos' },
  { icon: Truck,        label: 'Expenses',     path: '/extra-expenses' },
  { icon: UserCog,      label: 'Employees',    path: '/employees' },
  { icon: CreditCard,   label: 'Subscription', path: '/subscription' },
];

const SALES_TYPES = [
  { label: 'Sale Invoice',  type: 'invoice',              icon: '🧾' },
  { label: 'Quotation',     type: 'quotation',            icon: '📋' },
  { label: 'Proforma',      type: 'proforma',             icon: '📄' },
  { label: 'Sale Order',    type: 'order',                icon: '📦' },
  { label: 'Challan',       type: 'challan',              icon: '🚚' },
  { label: 'Sale Return',   type: 'invoice_cancellation', icon: '↩️' },
];

const THEME_OPTIONS: { id: ThemeMode; label: string; color: string }[] = [
  { id: 'dark',     label: 'Dark',    color: '#6366f1' },
  { id: 'light',    label: 'Light',   color: '#f59e0b' },
  { id: 'warm',     label: 'Warm',    color: '#f97316' },
  { id: 'ocean',    label: 'Ocean',   color: '#0ea5e9' },
  { id: 'emerald',  label: 'Emerald', color: '#10b981' },
  { id: 'rosewood', label: 'Rose',    color: '#e11d48' },
];

function readProfile() {
  try {
    const raw = localStorage.getItem('currentProfile');
    if (!raw) return {} as any;
    const p = JSON.parse(raw);
    return typeof p === 'string' ? JSON.parse(p) : p || {};
  } catch { return {}; }
}

function initials(name: string) {
  return String(name || 'P')
    .split(' ').filter(Boolean).slice(0, 2)
    .map((s) => s[0]).join('').toUpperCase();
}

function useOffline() {
  const [offline, setOffline] = useState(!navigator.onLine);
  useEffect(() => {
    const on  = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener('online',  on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  return offline;
}

export function MobileLayout({
  children,
  subscriptionWarning,
  subscriptionExpired,
  daysRemaining,
  profileGateChecked,
}: MobileLayoutProps) {
  const navigate   = useNavigate();
  const location   = useLocation();
  const { signOut } = useAuth();
  const offline    = useOffline();
  const transitioning = usePageTransition();
  const { theme, setTheme, resolvedTheme } = useTheme();

  // ── More sheet state ────────────────────────────────────────────────────────
  // sheetVisible = DOM present. sheetOpen = open CSS class applied.
  // Separated so exit animation plays before unmounting.
  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetOpen,    setSheetOpen]    = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  const openMore = useCallback(() => {
    setSheetVisible(true);
    // Two rAF ticks so sheet renders off-screen, THEN animates in
    requestAnimationFrame(() => requestAnimationFrame(() => setSheetOpen(true)));
  }, []);

  const closeMore = useCallback(() => {
    setSheetOpen(false);
    // Wait for CSS transition (350ms) before removing from DOM
    setTimeout(() => setSheetVisible(false), 370);
  }, []);

  // ── Swipe-down to dismiss ──────────────────────────────────────────────────
  const touchStartY = useRef(0);
  const touchDeltaY = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const onSheetTouchStart = useCallback((e: React.TouchEvent) => {
    const isAtTop = scrollRef.current ? scrollRef.current.scrollTop <= 0 : true;
    if (!isAtTop) {
      touchStartY.current = -1; // Ignore touch start if not at top
      return;
    }
    touchStartY.current = e.touches[0].clientY;
    touchDeltaY.current = 0;
    if (sheetRef.current) sheetRef.current.style.transition = 'none';
  }, []);

  const onSheetTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStartY.current < 0) return; // User started scrolling when not at top
    
    // Only drag down if we are at the top
    const isAtTop = scrollRef.current ? scrollRef.current.scrollTop <= 0 : true;
    if (!isAtTop) return;

    const delta = e.touches[0].clientY - touchStartY.current;
    if (delta > 0) {
      touchDeltaY.current = delta;
      if (sheetRef.current) {
        const y = delta < 100 ? delta : 100 + (delta - 100) * 0.25;
        sheetRef.current.style.transform = `translateY(${y}px)`;
      }
    }
  }, []);

  const onSheetTouchEnd = useCallback(() => {
    if (touchStartY.current < 0) return;
    if (sheetRef.current) {
      sheetRef.current.style.transition = '';
      sheetRef.current.style.transform  = '';
    }
    if (touchDeltaY.current > 70) {
      closeMore();
    }
    touchStartY.current = -1;
    touchDeltaY.current = 0;
  }, [closeMore]);

  // ── FAB ────────────────────────────────────────────────────────────────────
  const [fabOpen, setFabOpen] = useState(false);
  const fabRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);

  const joyStartY = useRef(0);
  const joyDeltaY = useRef(0);
  const joyRaf = useRef<number | null>(null);

  const onJoyStart = useCallback((e: React.TouchEvent) => {
    joyStartY.current = e.touches[0].clientY;
    joyDeltaY.current = 0;
    
    const loop = () => {
      const dy = joyDeltaY.current;
      if (mainRef.current && Math.abs(dy) > 10) {
        // "Pressure sensitive": Dragging further increases speed quadratically instead of linearly
        // e.g. 10px diff = 0 base
        // 20px (10 drag) = 1 * 0.02 * 100 = 2px/frame
        // 40px (30 drag) = 1 * 0.02 * 900 = 18px/frame
        // 60px (50 drag) = 1 * 0.02 * 2500 = 50px/frame (super fast)
        const pureDrag = Math.min(Math.abs(dy) - 10, 80); // Cap at warp speed
        const speed = (pureDrag * pureDrag * 0.018) * Math.sign(dy);
        mainRef.current.scrollTop += speed;
      }
      joyRaf.current = requestAnimationFrame(loop);
    };
    joyRaf.current = requestAnimationFrame(loop);
  }, []);

  const onJoyMove = useCallback((e: React.TouchEvent) => {
    if (joyStartY.current === 0) return;
    const dy = e.touches[0].clientY - joyStartY.current;
    
    // Auto-close menu if user starts scrolling while menu is open
    if (fabOpen && Math.abs(dy) > 15) setFabOpen(false);

    joyDeltaY.current = dy;
    
    // Visually transform the button
    if (fabRef.current) {
      const btn = fabRef.current.querySelector('.fab-btn') as HTMLButtonElement | null;
      if (btn) btn.style.transform = `translateY(${Math.max(-50, Math.min(50, dy))}px) ${fabOpen ? 'rotate(45deg)' : ''}`;
    }
  }, [fabOpen]);

  const onJoyEnd = useCallback((e: React.TouchEvent) => {
    if (joyRaf.current) cancelAnimationFrame(joyRaf.current);
    joyRaf.current = null;
    
    if (fabRef.current) {
      const btn = fabRef.current.querySelector('.fab-btn') as HTMLButtonElement | null;
      if (btn) btn.style.transform = fabOpen ? 'rotate(45deg)' : '';
    }
    joyStartY.current = 0;
    // Don't reset joyDeltaY here so onClick can see if it was a drag or tap!
  }, [fabOpen]);

  useEffect(() => {
    if (!fabOpen) return;
    const handler = (e: MouseEvent) => {
      if (fabRef.current && !fabRef.current.contains(e.target as Node)) setFabOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [fabOpen]);

  const profile = readProfile();
  const ini = initials(profile?.businessName);

  const isTabActive = (tab: (typeof PRIMARY_TABS)[number]) => {
    if (tab.path === '__more__')
      return MORE_ITEMS.some((m) => location.pathname.startsWith(m.path));
    if ('matchPrefixes' in tab)
      return (tab.matchPrefixes as readonly string[]).some((p) => location.pathname.startsWith(p));
    return location.pathname === tab.path || location.pathname.startsWith(tab.path + '/');
  };

  const goTo = (path: string) => {
    closeMore();
    setFabOpen(false);
    navigate(path);
  };

  const hideFab = location.pathname.startsWith('/documents/create') ||
                  location.pathname.startsWith('/documents/edit');

  const currentTheme = THEME_OPTIONS.find(t => t.id === theme) ?? THEME_OPTIONS[0];

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden z-0" style={{ background: 'var(--background, #0f172a)' }}>

      {/* ── Top bar ── */}
      <header
        className="shrink-0 flex items-center justify-between px-4"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 10px)',
          paddingBottom: '10px',
          minHeight: '56px',
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          borderBottom: '1px solid rgba(99, 102, 241, 0.2)',
        }}
      >
        <div className="flex items-center gap-2">
          <img src={logoImg} alt="BillVyapar" className="h-8 w-8 rounded-lg shadow-sm" style={{ objectFit: 'contain' }} />
          <span className="text-white font-bold text-lg tracking-tight">BillVyapar</span>
        </div>

        <div className="flex items-center gap-2">
          {offline && (
            <div className="flex items-center gap-1 rounded-full px-2 py-0.5" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <WifiOff className="h-3 w-3 text-white" />
              <span className="text-white text-[10px] font-medium">Offline</span>
            </div>
          )}
          {!offline && <div className="h-2 w-2 rounded-full bg-indigo-400" />}
          <button
            type="button"
            onClick={() => !subscriptionExpired && navigate('/profiles')}
            aria-label="Profile"
            className="h-9 w-9 rounded-full border-2 text-white flex items-center justify-center font-bold text-sm active:scale-95 transition-transform"
            style={{ background: 'rgba(99,102,241,0.3)', borderColor: 'rgba(99,102,241,0.5)' }}
          >
            {ini}
          </button>
        </div>
      </header>

      {/* ── Subscription warning ── */}
      {subscriptionWarning && (
        <div className="shrink-0 mx-3 mt-2 px-3 py-2 rounded-xl border border-amber-200 bg-amber-50 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
          <p className="text-xs text-amber-800 flex-1 leading-snug">{subscriptionWarning}</p>
          <button type="button" onClick={() => navigate('/subscription')} className="shrink-0 text-xs font-semibold text-amber-900 bg-amber-100 rounded-lg px-2 py-1">
            Renew
          </button>
        </div>
      )}

      {/* ── Page content ── */}
      <main
        ref={mainRef}
        className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain"
        style={{ WebkitOverflowScrolling: 'touch', background: 'var(--background, #0f172a)' } as any}
      >
        {!profileGateChecked ? (
          <div className="flex items-center justify-center h-full">
            <TraceLoader label="Loading..." />
          </div>
        ) : transitioning ? (
          <div className="p-4 space-y-3 animate-pulse" style={{ background: 'var(--background)' }}>
            <div className="h-7 w-40 rounded-xl bg-muted" />
            <div className="h-4 w-56 rounded-lg bg-muted/60" />
            <div className="h-12 w-full rounded-2xl mt-2 bg-muted" />
            <div className="rounded-2xl p-4 space-y-3 bg-muted/60">
              <div className="h-10 rounded-xl bg-muted" />
              <div className="h-10 rounded-xl bg-muted" />
              <div className="grid grid-cols-2 gap-2">
                <div className="h-10 rounded-xl bg-muted" />
                <div className="h-10 rounded-xl bg-muted" />
              </div>
            </div>
            {[1,2,3].map(i => (
              <div key={i} className="rounded-2xl p-4 space-y-2 bg-muted/60">
                <div className="flex gap-2">
                  <div className="h-5 w-24 rounded-full bg-muted" />
                  <div className="h-5 w-16 rounded-full bg-muted/60" />
                </div>
                <div className="h-4 w-48 rounded bg-muted/60" />
                <div className="h-4 w-20 rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : (
          <div key={location.pathname} className="page-enter">
            {children}
          </div>
        )}
      </main>

      {/* ── FAB (with Joystick Scroll) ── */}
      {!hideFab && (
        <div
          ref={fabRef}
          className="fixed right-4 z-40 flex flex-col items-end gap-2"
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 90px)' }}
        >
          <div className={`flex flex-col items-end gap-2 transition-all duration-200 origin-bottom ${fabOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2 pointer-events-none'}`}>
            {SALES_TYPES.map((s) => (
              <button key={s.type} type="button" onClick={() => goTo(`/documents/create?type=${encodeURIComponent(s.type)}`)}
                className="flex items-center gap-2.5 bg-card border border-border rounded-2xl pl-3 pr-4 py-2.5 shadow-lg active:scale-95 transition-transform">
                <span className="text-base leading-none">{s.icon}</span>
                <span className="text-sm font-medium text-foreground whitespace-nowrap">{s.label}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            className={`fab-btn h-14 w-14 rounded-full shadow-2xl flex items-center justify-center active:scale-95 ${fabOpen ? 'bg-slate-700' : ''}`}
            style={{
              transition: joyRaf.current ? 'background-color 0.2s' : 'transform 0.2s, background-color 0.2s',
              background: !fabOpen ? 'linear-gradient(135deg, #6366f1, #818cf8)' : undefined, 
              boxShadow: !fabOpen ? '0 4px 20px rgba(99,102,241,0.5)' : undefined,
              transform: fabOpen ? 'rotate(45deg)' : '',
              touchAction: 'none', // Prevents body scroll when scrubbing the joystick
            }}
            onTouchStart={onJoyStart}
            onTouchMove={onJoyMove}
            onTouchEnd={onJoyEnd}
            onClick={(e) => {
              if (Math.abs(joyDeltaY.current) < 10) {
                setFabOpen(v => !v);
              } else {
                e.preventDefault();
              }
            }}
            aria-label="Create document"
          >
            <Plus className="h-6 w-6 text-white" strokeWidth={2.5} />
          </button>
        </div>
      )}

      {/* ── Bottom tab bar ── */}
      <nav
        className="shrink-0 flex items-stretch relative"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          height: 'calc(60px + env(safe-area-inset-bottom, 0px))',
          background: '#0f172a',
          borderTop: '1px solid rgba(99, 102, 241, 0.2)',
        }}
      >
        {PRIMARY_TABS.map((tab) => {
          const Icon   = tab.icon;
          const active = isTabActive(tab);
          return (
            <button
              key={tab.path}
              type="button"
              onMouseEnter={() => tab.path !== '__more__' && prefetchRoute(tab.path)}
              onClick={() => tab.path === '__more__' ? openMore() : goTo(tab.path)}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 relative active:scale-90 transition-transform"
            >
              <Icon className="h-5 w-5 transition-colors" style={{ color: active ? '#818cf8' : '#475569' }} strokeWidth={active ? 2.5 : 1.8} />
              <span className="text-[10px] font-medium transition-colors" style={{ color: active ? '#818cf8' : '#475569' }}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* ════════════════════════════════════════════════════════
          More sheet — spring-eased + swipe-to-dismiss
          ════════════════════════════════════════════════════════ */}
      {sheetVisible && (
        <div
          className="fixed inset-0 z-50 flex flex-col"
          style={{
            background: sheetOpen ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0)',
            backdropFilter: sheetOpen ? 'blur(3px)' : 'none',
            WebkitBackdropFilter: sheetOpen ? 'blur(3px)' : 'none',
            transition: 'background 0.35s ease, backdrop-filter 0.35s ease',
          } as any}
        >
          {/* Backdrop tap to close */}
          <div className="flex-1" onClick={closeMore} />

          {/* Sheet container */}
          <div
            ref={sheetRef}
            className="flex flex-col mt-auto"
            style={{
              background: 'var(--background)',
              borderRadius: '28px 28px 0 0',
              boxShadow: '0 -8px 48px rgba(0,0,0,0.5)',
              maxHeight: '90vh',
              transform: sheetOpen ? 'translateY(0)' : 'translateY(100%)',
              transition: 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
              willChange: 'transform',
            }}
          >
            {/* ── DRAG HANDLE + TOUCH ZONE ── */}
            <div 
              className="shrink-0"
              onTouchStart={onSheetTouchStart}
              onTouchMove={onSheetTouchMove}
              onTouchEnd={onSheetTouchEnd}
            >
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-12 h-1.5 rounded-full" style={{ background: 'var(--border)', opacity: 0.5 }} />
              </div>
            </div>

            {/* ── SCROLLABLE INTERNAL AREA ── */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto overscroll-contain pb-6"
              style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)' }}
              onTouchStart={onSheetTouchStart}
              onTouchMove={onSheetTouchMove}
              onTouchEnd={onSheetTouchEnd}
            >
              {/* Business card */}
              <div className="mx-4 mb-4 flex items-center gap-3 rounded-2xl p-3.5"
                style={{ background: 'linear-gradient(135deg, #4f46e5, #6366f1)' }}>
                <div className="h-11 w-11 rounded-full bg-white/25 border-2 border-white/40 text-white flex items-center justify-center font-bold text-sm shrink-0">
                  {ini}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{profile.businessName || 'My Business'}</p>
                  <p className="text-xs text-blue-100 truncate mt-0.5">{profile.ownerName || ''}</p>
                </div>
                <button type="button" onClick={closeMore}
                  className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center shrink-0 active:scale-90 transition-transform"
                  aria-label="Close">
                  <X className="h-4 w-4 text-white" />
                </button>
              </div>

              {/* ── Nav grid — 4 col, bigger touch targets ── */}
              <div className="grid grid-cols-4 gap-2 px-4 pb-3">
                {MORE_ITEMS.map((item) => {
                  const Icon   = item.icon;
                  const active = location.pathname.startsWith(item.path);
                  return (
                    <button
                      key={item.path}
                      type="button"
                      onMouseEnter={() => prefetchRoute(item.path)}
                      onClick={() => goTo(item.path)}
                      className="flex flex-col items-center gap-1.5 rounded-2xl py-3.5 px-1 active:scale-90 transition-all"
                      style={{
                        minHeight: '68px',
                        background: active ? 'linear-gradient(135deg, #4f46e5, #6366f1)' : 'var(--muted)',
                        color: active ? '#fff' : 'var(--foreground)',
                        boxShadow: active ? '0 4px 14px rgba(99,102,241,0.45)' : 'none',
                      }}
                    >
                      <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 1.8} />
                      <span className="text-[10px] font-semibold text-center leading-tight">{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* ── Theme picker — visual swatch row ── */}
              <div className="mx-4 mb-3">
                <div className="rounded-2xl px-3 py-3" style={{ background: 'var(--muted)' }}>
                  {/* Header row */}
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2">
                      {resolvedTheme === 'dark'
                        ? <Moon className="h-4 w-4" style={{ color: currentTheme.color }} />
                        : <Sun  className="h-4 w-4" style={{ color: currentTheme.color }} />
                      }
                      <span className="text-sm font-semibold text-foreground">Appearance</span>
                    </div>
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: currentTheme.color + '22', color: currentTheme.color }}
                    >
                      {currentTheme.label}
                    </span>
                  </div>
                  {/* Swatch pills */}
                  <div className="flex gap-1.5">
                    {THEME_OPTIONS.map((opt) => {
                      const isActive = theme === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setTheme(opt.id)}
                          aria-label={opt.label}
                          className="flex-1 flex flex-col items-center gap-1 py-2 rounded-xl active:scale-90 transition-all"
                          style={{
                            background: isActive ? opt.color + '25' : 'transparent',
                            border: `2px solid ${isActive ? opt.color : 'transparent'}`,
                          }}
                        >
                          <div
                            className="h-5 w-5 rounded-full"
                            style={{
                              background: opt.color,
                              boxShadow: isActive ? `0 0 10px ${opt.color}99` : 'none',
                            }}
                          />
                          <span
                            className="text-[9px] font-semibold"
                            style={{ color: isActive ? opt.color : 'var(--muted-foreground)' }}
                          >
                            {opt.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* ── Sign out ── */}
              <div className="mx-4 mb-2">
                <button
                  type="button"
                  onClick={signOut}
                  className="w-full flex items-center justify-between py-3.5 px-4 rounded-2xl active:scale-95 transition-transform"
                  style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}
                >
                  <div className="flex items-center gap-2.5">
                    <LogOut className="h-4 w-4" />
                    <span className="text-sm font-semibold">Sign Out</span>
                  </div>
                  <ChevronRight className="h-4 w-4 opacity-50" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Subscription expired overlay ── */}
      {subscriptionExpired &&
        location.pathname !== '/subscription' &&
        location.pathname !== '/dashboard' &&
        location.pathname !== '/welcome' && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end">
            <div className="w-full bg-card rounded-t-3xl p-6 shadow-2xl"
              style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)' }}>
              <div className="flex items-start gap-3 mb-5">
                <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-base font-bold text-foreground">Subscription Expired</p>
                  <p className="text-sm text-muted-foreground mt-0.5">Renew to continue using BillVyapar.</p>
                  {typeof daysRemaining === 'number' && daysRemaining >= 0 && (
                    <p className="text-xs text-muted-foreground mt-1">Days remaining: {daysRemaining}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-3">
                <Button className="flex-1 h-12 rounded-xl" onClick={() => navigate('/subscription')}>Renew Now</Button>
                <Button variant="outline" className="flex-1 h-12 rounded-xl" onClick={signOut}>Sign Out</Button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
