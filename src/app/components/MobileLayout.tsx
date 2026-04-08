/**
 * MobileLayout — completely redesigned Android shell.
 * New visual language: dark navy base, vivid accent tabs,
 * floating pill nav bar, slide-up More drawer, joystick FAB.
 */
import { ReactNode, useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router';
import {
  LayoutDashboard, FileText, Users, BarChart3, MoreHorizontal,
  Plus, Package, Receipt, CreditCard, Landmark, LogOut, X,
  AlertCircle, ShoppingCart, Truck, ChevronRight,
  UserCog, Palette, BadgeCheck,
} from 'lucide-react';
const logoImg = './logo.png';
import { useTheme, type ThemeMode } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useDisplay, type DisplayScale } from '../contexts/DisplayContext';
import { TraceLoader } from './TraceLoader';
import { prefetchRoute } from '../hooks/usePrefetch';
import { App } from '@capacitor/app';

interface MobileLayoutProps {
  children: ReactNode;
  subscriptionWarning: string | null;
  subscriptionExpired: boolean;
  daysRemaining: number | null;
  profileGateChecked: boolean;
}

const PRIMARY_TABS = [
  { icon: LayoutDashboard, label: 'Home',    path: '/dashboard' },
  { icon: FileText,        label: 'Docs',    path: '/documents' },
  { icon: Users,           label: 'Parties', path: '/customers', matchPrefixes: ['/customers', '/suppliers'] },
  { icon: BarChart3,       label: 'Reports', path: '/analytics' },
  { icon: MoreHorizontal,  label: 'More',    path: '__more__' },
] as const;

const MORE_ITEMS = [
  { icon: Package,      label: 'Items',        path: '/items',          color: '#f59e0b' },
  { icon: Receipt,      label: 'GST Reports',  path: '/reports/gst',    color: '#10b981' },
  { icon: CreditCard,   label: 'Vyapar Khata', path: '/vyapar-khata-new', color: '#6366f1' },
  { icon: Landmark,     label: 'Bank',         path: '/bank-accounts',  color: '#0ea5e9' },
  { icon: ShoppingCart, label: 'POS',          path: '/pos',            color: '#f97316' },
  { icon: Truck,        label: 'Expenses',     path: '/extra-expenses', color: '#e11d48' },
  { icon: UserCog,      label: 'Employees',    path: '/employees',      color: '#8b5cf6' },
  { icon: BadgeCheck,   label: 'Subscription', path: '/subscription',   color: '#14b8a6' },
];

const SALES_TYPES = [
  { label: 'Sale Invoice',  type: 'invoice',              icon: '🧾', color: '#6366f1' },
  { label: 'Quotation',     type: 'quotation',            icon: '📋', color: '#0ea5e9' },
  { label: 'Proforma',      type: 'proforma',             icon: '📄', color: '#10b981' },
  { label: 'Sale Order',    type: 'order',                icon: '📦', color: '#f59e0b' },
  { label: 'Challan',       type: 'challan',              icon: '🚚', color: '#f97316' },
  { label: 'Sale Return',   type: 'invoice_cancellation', icon: '↩️', color: '#e11d48' },
];

const THEME_OPTIONS: { id: ThemeMode; label: string; color: string; bg: string }[] = [
  { id: 'dark',     label: 'Dark',    color: '#6366f1', bg: '#0f172a' },
  { id: 'light',    label: 'Light',   color: '#f59e0b', bg: '#fafaf9' },
  { id: 'warm',     label: 'Warm',    color: '#f97316', bg: '#1c0a03' },
  { id: 'ocean',    label: 'Ocean',   color: '#0ea5e9', bg: '#0c1a2e' },
  { id: 'emerald',  label: 'Emerald', color: '#10b981', bg: '#022c22' },
  { id: 'rosewood', label: 'Rose',    color: '#e11d48', bg: '#1a0010' },
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
  return String(name || 'B').split(' ').filter(Boolean).slice(0, 2).map(s => s[0]).join('').toUpperCase();
}

function useOffline() {
  const [offline, setOffline] = useState(!navigator.onLine);
  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  return offline;
}

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

export function MobileLayout({ children, subscriptionWarning, subscriptionExpired, daysRemaining, profileGateChecked }: MobileLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const offline = useOffline();
  const transitioning = usePageTransition();
  const { theme, setTheme } = useTheme();

  // ── More sheet ──────────────────────────────────────────────────────────────
  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [confirmSignOutVisible, setConfirmSignOutVisible] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const touchDeltaY = useRef(0);

  const openMore = useCallback(() => {
    setSheetVisible(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setSheetOpen(true)));
  }, []);

  const closeMore = useCallback(() => {
    setSheetOpen(false);
    setTimeout(() => setSheetVisible(false), 370);
  }, []);

  const onSheetTouchStart = useCallback((e: React.TouchEvent) => {
    const isAtTop = scrollRef.current ? scrollRef.current.scrollTop <= 0 : true;
    if (!isAtTop) { touchStartY.current = -1; return; }
    touchStartY.current = e.touches[0].clientY;
    touchDeltaY.current = 0;
    if (sheetRef.current) sheetRef.current.style.transition = 'none';
  }, []);

  const onSheetTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStartY.current < 0) return;
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
    if (sheetRef.current) { sheetRef.current.style.transition = ''; sheetRef.current.style.transform = ''; }
    if (touchDeltaY.current > 70) closeMore();
    touchStartY.current = -1; touchDeltaY.current = 0;
  }, [closeMore]);

  // ── FAB joystick ────────────────────────────────────────────────────────────
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
        const pureDrag = Math.min(Math.abs(dy) - 10, 80);
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
    if (fabOpen && Math.abs(dy) > 15) setFabOpen(false);
    joyDeltaY.current = dy;
    if (fabRef.current) {
      const btn = fabRef.current.querySelector('.fab-btn') as HTMLButtonElement | null;
      if (btn) btn.style.transform = `translateY(${Math.max(-50, Math.min(50, dy))}px)${fabOpen ? ' rotate(45deg)' : ''}`;
    }
  }, [fabOpen]);

  const onJoyEnd = useCallback(() => {
    if (joyRaf.current) cancelAnimationFrame(joyRaf.current);
    joyRaf.current = null;
    if (fabRef.current) {
      const btn = fabRef.current.querySelector('.fab-btn') as HTMLButtonElement | null;
      if (btn) btn.style.transform = fabOpen ? 'rotate(45deg)' : '';
    }
    joyStartY.current = 0;
    joyDeltaY.current = 0;
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
  const showFab = location.pathname === '/documents';
  const hideFab = !showFab;
  const { scale, setScale } = useDisplay();

  const isTabActive = (tab: (typeof PRIMARY_TABS)[number]) => {
    if (tab.path === '__more__') return MORE_ITEMS.some(m => location.pathname.startsWith(m.path));
    if ('matchPrefixes' in tab) return (tab.matchPrefixes as readonly string[]).some(p => location.pathname.startsWith(p));
    return location.pathname === tab.path || location.pathname.startsWith(tab.path + '/');
  };

  const goTo = (path: string) => { closeMore(); setFabOpen(false); navigate(path); };
  const currentTheme = THEME_OPTIONS.find(t => t.id === theme) ?? THEME_OPTIONS[0];

  // ── STEP-BY-STEP BACKING (WHATSAPP UX) ──────────────────────────────────────
  const lastBackPress = useRef<number>(0);
  
  useEffect(() => {
    let active = true;
    const backHandlerPromise = App.addListener('backButton', ({ canGoBack }) => {
      if (!active) return;
      
      // Step 0: Smart Logic - If keyboard/input is focused, blur it first
      const activeEl = document.activeElement as HTMLElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
        activeEl.blur();
        return;
      }

      // Step 1: Component Internals (Sign Out Dialog)
      if (confirmSignOutVisible) {
        setConfirmSignOutVisible(false);
        return;
      }
      
      // Step 2: More Sheet
      if (sheetOpen) {
        closeMore();
        return;
      }
      
      // Step 3: FAB Context Menu
      if (fabOpen) {
        setFabOpen(false);
        return;
      }

      // Step 4: Generic Overlays/Dialogs (Radix, Valu, etc.)
      const activeOverlay = document.querySelector('[role="dialog"], [role="alertdialog"], .radix-overlay');
      if (activeOverlay) {
        window.dispatchEvent(new KeyboardEvent('keydown', {
          key: 'Escape', keyCode: 27, code: 'Escape', which: 27, bubbles: true
        }));
        return;
      }

      // Step 5: Smart Exit Regression (Double-back to exit)
      const isRoot = location.pathname === '/dashboard' || location.pathname === '/welcome' || !canGoBack;
      if (isRoot) {
        const now = Date.now();
        if (now - lastBackPress.current < 2000) {
          App.exitApp();
        } else {
          lastBackPress.current = now;
          import('sonner').then(({ toast }) => {
            toast.info("Press back again to exit application", {
              position: 'bottom-center',
              className: 'font-black uppercase tracking-widest text-[9px] bg-indigo-600/90 text-white rounded-xl border-none text-center',
              duration: 2000,
            });
          });
        }
      } else {
        navigate(-1);
      }
    });

    return () => {
      active = false;
      backHandlerPromise.then(h => h.remove());
    };
  }, [confirmSignOutVisible, sheetOpen, fabOpen, location.pathname, navigate, closeMore]);

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column',
      overflow: 'hidden', background: 'var(--background, #0d1117)',
      WebkitTapHighlightColor: 'transparent' } as any}>

      {/* ── TOP BAR ─────────────────────────────────────────────────────────── */}
      <header style={{
        flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: 'calc(env(safe-area-inset-top,0px) + 8px)',
        paddingBottom: 8, paddingLeft: 20, paddingRight: 20,
        background: 'rgba(10, 10, 15, 0.6)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        zIndex: 45,
        boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)'
      }}>
        {/* Logo + name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 14, overflow: 'hidden',
            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 20px -4px rgba(99, 102, 241, 0.6), inset 0 0 0 1px rgba(255, 255, 255, 0.3)',
            animation: 'mobileLogoGlow 3s ease-in-out infinite' }}>
            <img src={logoImg} alt="" style={{ width: 32, height: 32, objectFit: 'contain' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 17, fontStyle: 'italic', fontWeight: 900, color: '#fff', letterSpacing: '-0.03em',
              lineHeight: 1, textTransform: 'uppercase', textShadow: '0 0 15px rgba(99,102,241,0.5)' }}>BillVyapar</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
              <span style={{ fontSize: 9, fontWeight: 800, color: '#818cf8', letterSpacing: '0.15em',
                textTransform: 'uppercase', opacity: 0.9 }}>Enterprise</span>
              <div style={{ width: 3, height: 3, borderRadius: '50%', background: '#4f46e5' }} />
              <span style={{ fontSize: 9, fontWeight: 800, color: '#a5b4fc', letterSpacing: '0.15em',
                textTransform: 'uppercase', opacity: 0.7 }}>HQ vv1.0.1</span>
            </div>
          </div>
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {offline ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px',
              borderRadius: 20, background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', animation: 'mobilePulse 1s infinite' }} />
              <span style={{ fontSize: 10, color: '#f87171', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Offline</span>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px',
              borderRadius: 20, background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)',
              boxShadow: 'inset 0 0 10px rgba(16,185,129,0.05)' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981' }} />
              <span style={{ fontSize: 10, color: '#34d399', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Live Cloud</span>
            </div>
          )}
          
          {/* Profile avatar - Glass Design */}
          <button type="button"
            onClick={() => !subscriptionExpired && navigate('/profiles')}
            style={{ width: 40, height: 40, borderRadius: 15,
              border: '1.5px solid rgba(255, 255, 255, 0.2)',
              background: 'rgba(255, 255, 255, 0.08)',
              color: '#fff', fontWeight: 900, fontSize: 14, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 4px 15px rgba(0,0,0,0.2), inset 0 0 0 1px rgba(255,255,255,0.05)',
              transition: 'all 0.2s', fontFamily: 'system-ui,sans-serif' }}>
            {ini}
          </button>
        </div>
      </header>

      {/* ── SUBSCRIPTION WARNING ─────────────────────────────────────────────── */}
      {subscriptionWarning && (
        <div style={{ flexShrink: 0, margin: '8px 12px 0', padding: '10px 14px',
          borderRadius: 14, background: 'rgba(245,158,11,0.1)',
          border: '1px solid rgba(245,158,11,0.25)',
          display: 'flex', alignItems: 'center', gap: 10 }}>
          <AlertCircle style={{ width: 16, height: 16, color: '#f59e0b', flexShrink: 0 }} />
          <p style={{ margin: 0, fontSize: 12, color: '#fbbf24', flex: 1, lineHeight: 1.4 }}>{subscriptionWarning}</p>
          <button type="button" onClick={() => navigate('/subscription')}
            style={{ padding: '4px 10px', borderRadius: 8, background: 'rgba(245,158,11,0.2)',
              border: '1px solid rgba(245,158,11,0.3)', color: '#fbbf24',
              fontSize: 11, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
            Renew
          </button>
        </div>
      )}

      {/* ── PAGE CONTENT ─────────────────────────────────────────────────────── */}
      <main ref={mainRef} style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch', background: 'var(--background,#0d1117)',
        touchAction: 'pan-y', overscrollBehavior: 'contain' } as any}>
        {!profileGateChecked ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <TraceLoader label="Loading..." />
          </div>
        ) : transitioning ? (
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[80, 56, 120, 56, 56].map((h, i) => (
              <div key={i} style={{ height: h, borderRadius: 16, background: 'rgba(255,255,255,0.05)',
                animation: 'mobilePulse 1.5s ease-in-out infinite' }} />
            ))}
          </div>
        ) : (
          <div key={location.pathname}>{children}</div>
        )}
      </main>

      {/* ── FAB ──────────────────────────────────────────────────────────────── */}
      {!hideFab && (
        <div ref={fabRef} style={{ position: 'fixed', right: 16, zIndex: 40,
          display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8,
          bottom: 'calc(env(safe-area-inset-bottom,0px) + 88px)',
          pointerEvents: 'none' }}>
          {/* Sales type menu */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6,
            transition: 'all 0.2s ease', transformOrigin: 'bottom',
            opacity: fabOpen ? 1 : 0, transform: fabOpen ? 'scale(1) translateY(0)' : 'scale(0.9) translateY(8px)',
            pointerEvents: fabOpen ? 'auto' : 'none' }}>
            {SALES_TYPES.map(s => (
              <button key={s.type} type="button"
                onClick={() => goTo(`/documents/create?type=${encodeURIComponent(s.type)}`)}
                style={{ display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 16px 10px 12px', borderRadius: 16,
                  background: 'rgba(13,17,23,0.95)', border: `1px solid ${s.color}30`,
                  boxShadow: `0 4px 20px rgba(0,0,0,0.4), 0 0 0 1px ${s.color}20`,
                  cursor: 'pointer', backdropFilter: 'blur(12px)' }}>
                <span style={{ width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                  background: `${s.color}20`, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: 16 }}>{s.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9',
                  whiteSpace: 'nowrap', fontFamily: 'system-ui,sans-serif' }}>{s.label}</span>
              </button>
            ))}
          </div>
          {/* FAB button — always receives pointer events */}
          <button type="button" className="fab-btn"
            style={{ width: 56, height: 56, borderRadius: 18, border: 'none', cursor: 'pointer',
              background: fabOpen ? '#1e293b' : 'linear-gradient(135deg,#4f46e5,#7c3aed)',
              boxShadow: fabOpen ? 'none' : '0 6px 24px rgba(79,70,229,0.55)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transform: fabOpen ? 'rotate(45deg)' : '',
              transition: 'background 0.2s, box-shadow 0.2s, transform 0.2s',
              touchAction: 'none', pointerEvents: 'auto' }}
            onTouchStart={onJoyStart} onTouchMove={onJoyMove} onTouchEnd={onJoyEnd}
            onClick={e => { if (Math.abs(joyDeltaY.current) < 10) setFabOpen(v => !v); else e.preventDefault(); }}
            aria-label="Create document">
            <Plus style={{ width: 24, height: 24, color: '#fff', strokeWidth: 2.5 }} />
          </button>
        </div>
      )}

      {/* ── BOTTOM NAV BAR ────────────────────────────────────────────────────── */}
      <nav style={{ 
        flexShrink: 0, 
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)',
        paddingTop: 12,
        paddingLeft: 12,
        paddingRight: 12,
        background: 'linear-gradient(180deg, rgba(10, 10, 15, 0) 0%, rgba(10, 10, 15, 0.95) 100%)',
        pointerEvents: 'none'
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'stretch', 
          height: 64,
          background: 'rgba(25, 25, 35, 0.85)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderRadius: 24,
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05)',
          pointerEvents: 'auto'
        }}>
          {PRIMARY_TABS.map(tab => {
            const Icon = tab.icon;
            const active = isTabActive(tab);
            return (
              <button key={tab.path} type="button"
                onMouseEnter={() => tab.path !== '__more__' && prefetchRoute(tab.path)}
                onClick={() => tab.path === '__more__' ? openMore() : goTo(tab.path)}
                style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', gap: 4, background: 'none', border: 'none',
                  cursor: 'pointer', position: 'relative' }}>
                
                {/* Active Glow/Indicator */}
                {active && (
                  <div style={{ 
                    position: 'absolute', 
                    top: 0, 
                    left: '50%', 
                    transform: 'translateX(-50%)',
                    width: 32, 
                    height: 2, 
                    background: '#6366f1',
                    boxShadow: '0 0 12px #6366f1',
                    borderRadius: '0 0 4px 4px'
                  }} />
                )}

                <div style={{ 
                  width: 44, height: 34, borderRadius: 12, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  background: active ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' 
                }}>
                  <Icon style={{ 
                    width: 22, height: 22, 
                    color: active ? '#818cf8' : 'rgba(255, 255, 255, 0.35)',
                    strokeWidth: active ? 2.5 : 2, 
                    filter: active ? 'drop-shadow(0 0 8px rgba(99, 102, 241, 0.5))' : 'none',
                    transition: 'all 0.3s' 
                  }} />
                </div>
                <span style={{ 
                  fontSize: 10, fontWeight: active ? 800 : 600,
                  color: active ? '#f1f5f9' : 'rgba(255, 255, 255, 0.35)',
                  letterSpacing: '0.02em',
                  textTransform: 'uppercase',
                  transition: 'color 0.3s' 
                }}>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* ── MORE DRAWER ──────────────────────────────────────────────────────── */}
      {sheetVisible && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column',
          background: sheetOpen ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0)',
          backdropFilter: sheetOpen ? 'blur(4px)' : 'none',
          transition: 'background 0.35s ease, backdrop-filter 0.35s ease' } as any}>
          <div style={{ flex: 1 }} onClick={closeMore} />

          <div ref={sheetRef} style={{ background: '#111827',
            borderRadius: '28px 28px 0 0',
            boxShadow: '0 -12px 60px rgba(0,0,0,0.6)',
            maxHeight: '88vh',
            transform: sheetOpen ? 'translateY(0)' : 'translateY(100%)',
            transition: 'transform 0.35s cubic-bezier(0.32,0.72,0,1)',
            willChange: 'transform', display: 'flex', flexDirection: 'column' }}>

            {/* Drag handle zone */}
            <div style={{ flexShrink: 0 }}
              onTouchStart={onSheetTouchStart} onTouchMove={onSheetTouchMove} onTouchEnd={onSheetTouchEnd}>
              <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 8px' }}>
                <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)' }} />
              </div>
            </div>

            {/* Scrollable content */}
            <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden',
              paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + 24px)' }}
              onTouchStart={onSheetTouchStart} onTouchMove={onSheetTouchMove} onTouchEnd={onSheetTouchEnd}>

              {/* Business card header */}
              <div style={{ margin: '0 16px 16px', padding: '14px 16px', borderRadius: 20,
                background: 'linear-gradient(135deg,#1e1b4b,#312e81)',
                border: '1px solid rgba(99,102,241,0.3)',
                display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 14, flexShrink: 0,
                  background: 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: 15, color: '#fff',
                  fontFamily: 'system-ui,sans-serif' }}>{ini}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#fff',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {profile.businessName || 'My Business'}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(199,210,254,0.7)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {profile.ownerName || ''}
                  </p>
                </div>
                <button type="button" onClick={closeMore}
                  style={{ width: 32, height: 32, borderRadius: 10, border: 'none', cursor: 'pointer',
                    background: 'rgba(255,255,255,0.15)', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <X style={{ width: 16, height: 16 }} />
                </button>
              </div>

              {/* Nav grid — 4 columns, icon + label + color accent */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, padding: '0 16px 16px' }}>
                {MORE_ITEMS.map(item => {
                  const Icon = item.icon;
                  const active = location.pathname.startsWith(item.path);
                  return (
                    <button key={item.path} type="button"
                      onMouseEnter={() => prefetchRoute(item.path)}
                      onClick={() => goTo(item.path)}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                        padding: '14px 4px 12px', borderRadius: 18, cursor: 'pointer',
                        minHeight: 72,
                        background: active ? `${item.color}20` : 'rgba(255,255,255,0.04)',
                        border: active ? `1.5px solid ${item.color}40` : '1.5px solid rgba(255,255,255,0.06)',
                        transition: 'all 0.15s' }}>
                      <div style={{ width: 36, height: 36, borderRadius: 12,
                        background: active ? `${item.color}25` : 'rgba(255,255,255,0.07)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon style={{ width: 18, height: 18, color: active ? item.color : 'rgba(255,255,255,0.55)',
                          strokeWidth: active ? 2.5 : 1.8 }} />
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 600, textAlign: 'center', lineHeight: 1.2,
                        color: active ? item.color : 'rgba(255,255,255,0.55)',
                        fontFamily: 'system-ui,sans-serif' }}>{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Theme picker */}
              <div style={{ margin: '0 16px 12px', padding: '14px', borderRadius: 20,
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Palette style={{ width: 16, height: 16, color: currentTheme.color }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9',
                    fontFamily: 'system-ui,sans-serif' }}>Appearance</span>
                  <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700,
                    padding: '2px 8px', borderRadius: 20,
                    background: `${currentTheme.color}20`, color: currentTheme.color }}>
                    {currentTheme.label}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {THEME_OPTIONS.map(opt => {
                    const isActive = theme === opt.id;
                    return (
                      <button key={opt.id} type="button" onClick={() => setTheme(opt.id)}
                        aria-label={opt.label}
                        style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                          gap: 5, padding: '8px 2px', borderRadius: 12, border: 'none', cursor: 'pointer',
                          background: isActive ? `${opt.color}18` : 'transparent',
                          outline: isActive ? `2px solid ${opt.color}` : '2px solid transparent',
                          transition: 'all 0.15s' }}>
                        <div style={{ width: 22, height: 22, borderRadius: '50%', background: opt.color,
                          boxShadow: isActive ? `0 0 12px ${opt.color}80` : 'none',
                          transition: 'box-shadow 0.15s' }} />
                        <span style={{ fontSize: 9, fontWeight: 700,
                          color: isActive ? opt.color : 'rgba(255,255,255,0.35)',
                          fontFamily: 'system-ui,sans-serif' }}>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Display density / font size settings */}
              <div style={{ margin: '0 16px 12px', padding: '14px', borderRadius: 20,
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
                  </svg>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', fontFamily: 'system-ui,sans-serif' }}>Display Size</span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {([
                    { id: 'compact', label: 'Compact', icon: 'A', size: 11 },
                    { id: 'medium',  label: 'Medium',  icon: 'A', size: 14 },
                    { id: 'large',   label: 'Large',   icon: 'A', size: 18 },
                  ] as { id: DisplayScale; label: string; icon: string; size: number }[]).map(opt => {
                    const active = scale === opt.id;
                    return (
                      <button key={opt.id} type="button" onClick={() => setScale(opt.id)}
                        style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                          gap: 5, padding: '10px 4px', borderRadius: 14, border: 'none', cursor: 'pointer',
                          background: active ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)',
                          outline: active ? '2px solid rgba(99,102,241,0.6)' : '2px solid transparent',
                          transition: 'all 0.15s' }}>
                        <span style={{ fontSize: opt.size, fontWeight: 800, color: active ? '#a5b4fc' : 'rgba(255,255,255,0.45)', lineHeight: 1, fontFamily: 'system-ui,sans-serif' }}>
                          {opt.icon}
                        </span>
                        <span style={{ fontSize: 10, fontWeight: 600, color: active ? '#a5b4fc' : 'rgba(255,255,255,0.35)', fontFamily: 'system-ui,sans-serif' }}>
                          {opt.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sign out */}
              <div style={{ margin: '0 16px' }}>
                <button type="button" onClick={() => setConfirmSignOutVisible(true)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 16px', borderRadius: 16, cursor: 'pointer',
                    background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 10,
                      background: 'rgba(239,68,68,0.15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <LogOut style={{ width: 16, height: 16, color: '#f87171' }} />
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#f87171',
                      fontFamily: 'system-ui,sans-serif' }}>Sign Out</span>
                  </div>
                  <ChevronRight style={{ width: 16, height: 16, color: 'rgba(248,113,113,0.5)' }} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SIGN OUT CONFIRMATION ────────────────────────────────────────────── */}
      {confirmSignOutVisible && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60,
          background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={() => setConfirmSignOutVisible(false)}>
          <div onClick={e => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 480,
              background: '#1e293b',
              borderRadius: '24px 24px 0 0',
              padding: '8px 20px 0',
              paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + 20px)',
              boxShadow: '0 -12px 48px rgba(0,0,0,0.4)' }}>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 16px' }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <div style={{ width: 56, height: 56, borderRadius: 18,
                background: 'rgba(239,68,68,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <LogOut style={{ width: 26, height: 26, color: '#f87171' }} />
              </div>
            </div>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <p style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 800, color: '#f1f5f9',
                fontFamily: 'system-ui,sans-serif' }}>Sign Out?</p>
              <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.5)',
                fontFamily: 'system-ui,sans-serif', lineHeight: 1.5 }}>
                You'll need to sign in again to access your account.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
              <button type="button" onClick={() => setConfirmSignOutVisible(false)}
                style={{ flex: 1, height: 50, borderRadius: 14, cursor: 'pointer',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: '#f1f5f9', fontSize: 15, fontWeight: 600,
                  fontFamily: 'system-ui,sans-serif' }}>
                Cancel
              </button>
              <button type="button" onClick={() => { setConfirmSignOutVisible(false); signOut(); }}
                style={{ flex: 1, height: 50, borderRadius: 14, cursor: 'pointer',
                  background: '#dc2626',
                  border: 'none',
                  color: '#fff', fontSize: 15, fontWeight: 700,
                  fontFamily: 'system-ui,sans-serif',
                  boxShadow: '0 4px 16px rgba(220,38,38,0.3)' }}>
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SUBSCRIPTION EXPIRED OVERLAY ─────────────────────────────────────── */}
      {subscriptionExpired &&
        location.pathname !== '/subscription' &&
        location.pathname !== '/dashboard' &&
        location.pathname !== '/welcome' &&
        location.pathname !== '/profiles' && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 50,
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'flex-end' }}>
            <div style={{ width: '100%', background: '#1e293b',
              borderRadius: '28px 28px 0 0', padding: '24px 20px',
              paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + 24px)',
              boxShadow: '0 -12px 60px rgba(0,0,0,0.4)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 20 }}>
                <div style={{ width: 44, height: 44, borderRadius: 14, flexShrink: 0,
                  background: 'rgba(239,68,68,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertCircle style={{ width: 22, height: 22, color: '#f87171' }} />
                </div>
                <div>
                  <p style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: '#f1f5f9',
                    fontFamily: 'system-ui,sans-serif' }}>Subscription Expired</p>
                  <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.5)',
                    fontFamily: 'system-ui,sans-serif' }}>Renew to continue using BillVyapar.</p>
                  {typeof daysRemaining === 'number' && daysRemaining >= 0 && (
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.35)',
                      fontFamily: 'system-ui,sans-serif' }}>Days remaining: {daysRemaining}</p>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={() => navigate('/subscription')}
                  style={{ flex: 1, height: 50, borderRadius: 14, border: 'none', cursor: 'pointer',
                    background: '#4f46e5', color: '#fff',
                    fontSize: 15, fontWeight: 700, fontFamily: 'system-ui,sans-serif',
                    boxShadow: '0 4px 16px rgba(79,70,229,0.4)' }}>
                  Renew Now
                </button>
                <button type="button" onClick={signOut}
                  style={{ flex: 1, height: 50, borderRadius: 14, cursor: 'pointer',
                    background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
                    color: '#f1f5f9', fontSize: 15, fontWeight: 600,
                    fontFamily: 'system-ui,sans-serif' }}>
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        )}

      <style>{`
        @keyframes mobilePulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes mobileLogoGlow {
          0%, 100% { box-shadow: 0 8px 20px -4px rgba(99, 102, 241, 0.6), inset 0 0 0 1px rgba(255, 255, 255, 0.3); }
          50% { box-shadow: 0 12px 30px -2px rgba(129, 140, 248, 0.8), inset 0 0 0 1.5px rgba(255, 255, 255, 0.5); }
        }
        * { -webkit-tap-highlight-color: transparent; }
        .card, [class*="card"], [data-slot="card"] { touch-action: pan-y; }
      `}</style>
    </div>
  );
}
