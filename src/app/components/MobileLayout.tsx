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
  UserCog, Palette, BadgeCheck, Moon, Sun, Flame, Waves, Leaf, Heart,
} from 'lucide-react';
const logoImg = './logo.png';
import { useTheme, type ThemeMode } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useDisplay, type DisplayScale } from '../contexts/DisplayContext';
import { TraceLoader } from './TraceLoader';
import { prefetchRoute } from '../hooks/usePrefetch';
import { App } from '@capacitor/app';
import { MOBILE_TOKENS, MOBILE_STYLES } from '../mobile/MobileDesignSystem';

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
  { icon: CreditCard,   label: 'Party Ledger', path: '/ledger',         color: '#8b5cf6' },
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

const THEME_OPTIONS: { id: ThemeMode; label: string; color: string; bg: string; icon: any }[] = [
  { id: 'dark',     label: 'Dark',    color: '#6366f1', bg: '#0f172a', icon: Moon },
  { id: 'light',    label: 'Light',   color: '#f59e0b', bg: '#fafaf9', icon: Sun },
  { id: 'warm',     label: 'Warm',    color: '#f97316', bg: '#1c0a03', icon: Flame },
  { id: 'ocean',    label: 'Ocean',   color: '#0ea5e9', bg: '#0c1a2e', icon: Waves },
  { id: 'emerald',  label: 'Emerald', color: '#10b981', bg: '#022c22', icon: Leaf },
  { id: 'rosewood', label: 'Rose',    color: '#e11d48', bg: '#1a0010', icon: Heart },
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
    const t = setTimeout(() => setTransitioning(false), 0);
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
  const { theme, setTheme, resolvedTheme } = useTheme();

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
        paddingTop: 'calc(env(safe-area-inset-top,0px) + 0.6rem)',
        paddingBottom: '0.6rem', paddingLeft: `${MOBILE_TOKENS.spacing.lg}px`, paddingRight: `${MOBILE_TOKENS.spacing.lg}px`,
        background: 'rgba(var(--bg-rgb, 10, 10, 15), 0.6)',
        borderBottom: `1px solid ${MOBILE_TOKENS.colors.border}`,
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        zIndex: 45,
        boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)'
      }}>
        {/* Logo + name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: `${MOBILE_TOKENS.spacing.lg * 0.6}px` }}>
          <div style={{ width: '3rem', height: '3rem', borderRadius: `${MOBILE_TOKENS.radius.md}px`, overflow: 'hidden',
            background: 'var(--primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 8px 20px -4px rgba(99, 102, 241, 0.6), inset 0 0 0 1px rgba(255, 255, 255, 0.3)`,
            animation: 'mobileLogoGlow 3s ease-in-out infinite' }}>
            <img src={logoImg} alt="" style={{ width: '2.45rem', height: '2.45rem', objectFit: 'contain' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '1.3rem', fontStyle: 'italic', fontWeight: 900, color: MOBILE_TOKENS.colors.text, letterSpacing: '-0.03em',
              lineHeight: 1, textTransform: 'uppercase', textShadow: `0 0 15px ${MOBILE_TOKENS.colors.accent}` }}>BillVyapar</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: `${MOBILE_TOKENS.spacing.xs}px`, marginTop: '0.2rem' }}>
              <span style={{ fontSize: '0.69rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: '0.15em',
                textTransform: 'uppercase', opacity: 0.9 }}>Enterprise</span>
              <div style={{ width: '0.2rem', height: '0.2rem', borderRadius: '50%', background: MOBILE_TOKENS.colors.accent }} />
              <span style={{ fontSize: '0.69rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: '0.15em',
                textTransform: 'uppercase', opacity: 0.7 }}>HQ vv1.0.1</span>
            </div>
          </div>
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: `${MOBILE_TOKENS.spacing.lg * 0.6}px` }}>
          {offline ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: `${MOBILE_TOKENS.spacing.xs}px`, padding: `${MOBILE_TOKENS.spacing.xs}px ${MOBILE_TOKENS.spacing.md}px`,
              borderRadius: `${MOBILE_TOKENS.radius.full}px`, background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
              <div style={{ width: `${MOBILE_TOKENS.spacing.xs}px`, height: `${MOBILE_TOKENS.spacing.xs}px`, borderRadius: '50%', background: MOBILE_TOKENS.colors.error, animation: 'mobilePulse 1s infinite' }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--destructive)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Offline</span>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: `${MOBILE_TOKENS.spacing.xs}px`, padding: `${MOBILE_TOKENS.spacing.xs}px ${MOBILE_TOKENS.spacing.md}px`,
              borderRadius: `${MOBILE_TOKENS.radius.full}px`, background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)',
              boxShadow: 'inset 0 0 10px rgba(16,185,129,0.05)' }}>
              <div style={{ width: `${MOBILE_TOKENS.spacing.xs}px`, height: `${MOBILE_TOKENS.spacing.xs}px`, borderRadius: '50%', background: MOBILE_TOKENS.colors.success, boxShadow: `0 0 10px ${MOBILE_TOKENS.colors.success}` }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--secondary)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Live Cloud</span>
            </div>
          )}
          
          {/* Profile avatar - Glass Design */}
          <button type="button"
            onClick={() => !subscriptionExpired && navigate('/profiles')}
            style={{ width: '3rem', height: '3rem', borderRadius: `${MOBILE_TOKENS.radius.md}px`,
              border: `1.5px solid ${MOBILE_TOKENS.colors.border}`,
              background: MOBILE_TOKENS.colors.surface,
              color: MOBILE_TOKENS.colors.text, fontWeight: 900, fontSize: '1.08rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
              transition: 'all 0.2s', fontFamily: 'system-ui,sans-serif' }}>
            {ini}
          </button>
        </div>
      </header>

      {/* ── SUBSCRIPTION WARNING ─────────────────────────────────────────────── */}
      {subscriptionWarning && (
        <div style={{ flexShrink: 0, margin: `${MOBILE_TOKENS.spacing.xs}px ${MOBILE_TOKENS.spacing.md}px 0`, padding: `${MOBILE_TOKENS.spacing.md}px ${MOBILE_TOKENS.spacing.lg}px`,
          borderRadius: `${MOBILE_TOKENS.radius.lg}px`, background: 'rgba(245,158,11,0.1)',
          border: '1px solid rgba(245,158,11,0.25)',
          display: 'flex', alignItems: 'center', gap: MOBILE_TOKENS.spacing.md }}>
          <AlertCircle style={{ width: 16, height: 16, color: MOBILE_TOKENS.colors.warning, flexShrink: 0 }} />
          <p style={{ margin: 0, fontSize: 12, color: 'var(--warning)', flex: 1, lineHeight: 1.4 }}>{subscriptionWarning}</p>
          <button type="button" onClick={() => navigate('/subscription')}
            style={{ padding: `${MOBILE_TOKENS.spacing.xs}px ${MOBILE_TOKENS.spacing.md}px`, borderRadius: `${MOBILE_TOKENS.radius.md}px`, background: 'rgba(245,158,11,0.2)',
              border: '1px solid rgba(245,158,11,0.3)', color: 'var(--warning)',
              fontSize: 11, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
            Renew
          </button>
        </div>
      )}

      {/* ── PAGE CONTENT ─────────────────────────────────────────────────────── */}
      <main ref={mainRef} style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch', background: resolvedTheme === 'light' ? '#fafaf9' : MOBILE_TOKENS.colors.bg,
        touchAction: 'pan-y', overscrollBehavior: 'contain' } as any}>
        {!profileGateChecked ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <TraceLoader label="Loading..." />
          </div>
        ) : transitioning ? (
          <div style={{ padding: MOBILE_TOKENS.spacing.md, display: 'flex', flexDirection: 'column', gap: MOBILE_TOKENS.spacing.md }}>
            {[80, 56, 120, 56, 56].map((h, i) => (
              <div key={i} style={{ height: h, borderRadius: MOBILE_TOKENS.radius.lg, background: resolvedTheme === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)',
                animation: 'mobilePulse 1.5s ease-in-out infinite' }} />
            ))}
          </div>
        ) : (
          <div key={location.pathname}>{children}</div>
        )}
      </main>

      {/* ── FAB ──────────────────────────────────────────────────────────────── */}
      {!hideFab && (
        <div ref={fabRef} style={{ position: 'fixed', right: MOBILE_TOKENS.spacing.lg, zIndex: 40,
          display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: MOBILE_TOKENS.spacing.md,
          bottom: `calc(${MOBILE_TOKENS.safeAreaBottom} + 88px)`,
          pointerEvents: 'none' }}>
          {/* Sales type menu */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: MOBILE_TOKENS.spacing.xs,
            transition: 'opacity 0.15s ease, transform 0.15s ease', transformOrigin: 'bottom',
            opacity: fabOpen ? 1 : 0, transform: fabOpen ? 'scale(1) translateY(0)' : 'scale(0.9) translateY(8px)',
            pointerEvents: fabOpen ? 'auto' : 'none' }}>
            {SALES_TYPES.map(s => (
              <button key={s.type} type="button"
                onClick={() => goTo(`/documents/create?type=${encodeURIComponent(s.type)}`)}
                style={{ display: 'flex', alignItems: 'center', gap: MOBILE_TOKENS.spacing.md,
                  padding: `${MOBILE_TOKENS.spacing.md}px ${MOBILE_TOKENS.spacing.lg}px ${MOBILE_TOKENS.spacing.md}px ${MOBILE_TOKENS.spacing.md}px`, borderRadius: MOBILE_TOKENS.radius.lg,
                  background: 'rgba(13,17,23,0.95)', border: `1px solid ${s.color}30`,
                  boxShadow: `0 4px 20px rgba(0,0,0,0.4), 0 0 0 1px ${s.color}20`,
                  cursor: 'pointer', backdropFilter: 'blur(12px)' }}>
                <span style={{ width: 32, height: 32, borderRadius: MOBILE_TOKENS.radius.md, flexShrink: 0,
                  background: `${s.color}20`, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: 16 }}>{s.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: MOBILE_TOKENS.colors.text,
                  whiteSpace: 'nowrap', fontFamily: 'system-ui,sans-serif' }}>{s.label}</span>
              </button>
            ))}
          </div>
          {/* FAB button — always receives pointer events */}
          <button type="button" className="fab-btn"
            style={{ width: 56, height: 56, borderRadius: MOBILE_TOKENS.radius.lg, border: 'none', cursor: 'pointer',
              background: fabOpen ? MOBILE_TOKENS.colors.surface : 'var(--primary)',
              boxShadow: fabOpen ? 'none' : `0 6px 24px rgba(79,70,229,0.55)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transform: fabOpen ? 'rotate(45deg)' : '',
              transition: 'background 0.2s, box-shadow 0.2s, transform 0.2s',
              touchAction: 'none', pointerEvents: 'auto' }} onClick={() => setFabOpen(!fabOpen)}>
            <Plus style={{ width: 28, height: 28, color: fabOpen ? 'var(--foreground)' : 'var(--primary-foreground)' }} strokeWidth={2.5} />
          </button>
        </div>
      )}

      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
          padding: `${MOBILE_TOKENS.spacing.md * 0.6}px ${MOBILE_TOKENS.spacing.md}px calc(${MOBILE_TOKENS.safeAreaBottom} + ${MOBILE_TOKENS.spacing.md * 0.6}px)`,
          pointerEvents: 'none' }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'stretch', 
          height: '4.95rem',
          background: MOBILE_TOKENS.colors.surface,
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderRadius: `${MOBILE_TOKENS.radius.xl}px`,
          border: `1px solid ${MOBILE_TOKENS.colors.border}`,
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
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
                  justifyContent: 'center', gap: `${MOBILE_TOKENS.spacing.xs * 0.75}px`, background: 'none', border: 'none',
                  cursor: 'pointer', position: 'relative' }}>
                
                {/* Active Glow/Indicator */}
                {active && (
                  <div style={{ 
                    position: 'absolute', 
                    top: 0, 
                    left: '50%', 
                    transform: 'translateX(-50%)',
                    width: '2.45rem', 
                    height: '0.15rem', 
                    background: MOBILE_TOKENS.colors.accent,
                    boxShadow: `0 0 12px ${MOBILE_TOKENS.colors.accent}`,
                    borderRadius: '0 0 0.3rem 0.3rem'
                  }} />
                )}
 
                <div style={{
                  width: '3.4rem', height: '2.6rem', borderRadius: `${MOBILE_TOKENS.radius.md}px`, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  background: active ? `${MOBILE_TOKENS.colors.accent}18` : 'transparent',
                  transition: 'background 0.2s ease'
                }}>
                  <Icon style={{
                    width: '1.7rem', height: '1.7rem',
                    color: active ? MOBILE_TOKENS.colors.accent : MOBILE_TOKENS.colors.textMuted,
                    strokeWidth: active ? 2.5 : 2,
                    filter: active ? `drop-shadow(0 0 8px ${MOBILE_TOKENS.colors.accent})` : 'none',
                    transition: 'color 0.2s ease, filter 0.2s ease'
                  }} />
                </div>
                <span style={{
                  fontSize: '0.75rem', fontWeight: active ? 800 : 600,
                  color: active ? MOBILE_TOKENS.colors.text : MOBILE_TOKENS.colors.textMuted,
                  letterSpacing: '0.02em',
                  textTransform: 'uppercase',
                  transition: 'color 0.2s ease'
                }}>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* ── MORE DRAWER ──────────────────────────────────────────────────────── */}
      {sheetVisible && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column',
          background: sheetOpen ? MOBILE_TOKENS.colors.overlay : 'rgba(0,0,0,0)',
          backdropFilter: sheetOpen ? 'blur(4px)' : 'none',
          transition: 'background 0.35s ease, backdrop-filter 0.35s ease' } as any}>
          <div style={{ flex: 1 }} onClick={closeMore} />

          <div ref={sheetRef} style={{ background: MOBILE_TOKENS.colors.surface,
            borderRadius: `${MOBILE_TOKENS.radius.xl}px ${MOBILE_TOKENS.radius.xl}px 0 0`,
            boxShadow: '0 -12px 60px rgba(0,0,0,0.6)',
            maxHeight: '88vh',
            transform: sheetOpen ? 'translateY(0)' : 'translateY(100%)',
            transition: 'transform 0.35s cubic-bezier(0.32,0.72,0,1)',
            display: 'flex', flexDirection: 'column' }}>

            {/* Drag handle zone */}
            <div style={{ flexShrink: 0 }}
              onTouchStart={onSheetTouchStart} onTouchMove={onSheetTouchMove} onTouchEnd={onSheetTouchEnd}>
              <div style={{ display: 'flex', justifyContent: 'center', padding: `${MOBILE_TOKENS.spacing.md}px 0 ${MOBILE_TOKENS.spacing.xs}px` }}>
                <div style={{ width: 40, height: 4, borderRadius: 2, background: MOBILE_TOKENS.colors.borderLight }} />
              </div>
            </div>

            {/* Scrollable content */}
            <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden',
              paddingBottom: `calc(${MOBILE_TOKENS.safeAreaBottom} + ${MOBILE_TOKENS.spacing.lg}px)` }}
              onTouchStart={onSheetTouchStart} onTouchMove={onSheetTouchMove} onTouchEnd={onSheetTouchEnd}>

              {/* Header with close button */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `${MOBILE_TOKENS.spacing.lg}px ${MOBILE_TOKENS.spacing.lg}px 0`, marginBottom: MOBILE_TOKENS.spacing.lg }}>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: MOBILE_TOKENS.colors.text, fontFamily: 'system-ui,sans-serif' }}>Menu</h2>
                <button type="button" onClick={closeMore}
                  style={{ width: '2.45rem', height: '2.45rem', borderRadius: MOBILE_TOKENS.radius.md, border: 'none', cursor: 'pointer',
                    background: 'var(--muted)', color: MOBILE_TOKENS.colors.text,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <X style={{ width: '1.25rem', height: '1.25rem' }} />
                </button>
              </div>

              {/* Business card header */}
              <div style={{ margin: `0 ${MOBILE_TOKENS.spacing.lg}px ${MOBILE_TOKENS.spacing.lg}px`, padding: `${MOBILE_TOKENS.spacing.lg * 0.85}px ${MOBILE_TOKENS.spacing.lg}px`, borderRadius: MOBILE_TOKENS.radius.lg,
                background: 'var(--primary)',
                border: `1px solid var(--border)`,
                display: 'flex', alignItems: 'center', gap: `${MOBILE_TOKENS.spacing.lg * 0.6}px` }}>
                <div style={{ width: '3.4rem', height: '3.4rem', borderRadius: MOBILE_TOKENS.radius.md, flexShrink: 0,
                  background: 'var(--primary-foreground)20', border: '2px solid var(--primary-foreground)30',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: '1.15rem', color: 'var(--primary-foreground)',
                  fontFamily: 'system-ui,sans-serif' }}>{ini}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--primary-foreground)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {profile.businessName || 'My Business'}
                  </p>
                  <p style={{ margin: `${MOBILE_TOKENS.spacing.xs * 0.15}rem 0 0`, fontSize: '0.92rem', color: 'var(--primary-foreground)',
                    opacity: 0.7,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {profile.ownerName || ''}
                  </p>
                </div>
              </div>

              {/* Nav grid — 3 columns, larger items */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: `${MOBILE_TOKENS.spacing.md}px`, padding: `${MOBILE_TOKENS.spacing.lg}px ${MOBILE_TOKENS.spacing.lg}px 0` }}>
                {(() => {
                  console.log('DEBUG MORE_ITEMS:', MORE_ITEMS);
                  console.log('DEBUG MORE_ITEMS length:', MORE_ITEMS.length);
                  console.log('DEBUG resolvedTheme:', resolvedTheme);
                  return null;
                })()}
                {MORE_ITEMS.map(item => {
                  const Icon = item.icon;
                  const active = location.pathname.startsWith(item.path);
                  const isLightTheme = resolvedTheme === 'light';
                  
                  return (
                    <button key={item.path} type="button"
                      onMouseEnter={() => prefetchRoute(item.path)}
                      onClick={() => goTo(item.path)}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: `${MOBILE_TOKENS.spacing.md}px`,
                        padding: `${MOBILE_TOKENS.spacing.lg}px ${MOBILE_TOKENS.spacing.md}px`, borderRadius: `${MOBILE_TOKENS.radius.lg}px`, cursor: 'pointer',
                        minHeight: '7rem',
                        background: active ? item.color : 'var(--muted)',
                        border: active ? `1.5px solid ${item.color}` : '1.5px solid var(--border)',
                        transition: 'all 0.2s ease',
                        boxShadow: active ? `0 4px 12px ${item.color}30` : 'none' }}>
                      <div style={{ width: '3.2rem', height: '3.2rem', borderRadius: MOBILE_TOKENS.radius.md,
                        background: active ? 'rgba(255,255,255,0.25)' : `${item.color}40`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: active ? 'none' : `0 2px 8px ${item.color}25` }}>
                        <Icon style={{ width: '1.6rem', height: '1.6rem', color: active ? '#ffffff' : item.color,
                          strokeWidth: 2.5,
                          filter: active ? 'drop-shadow(0 0 4px rgba(255,255,255,0.3))' : 'none' }} />
                      </div>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, textAlign: 'center', lineHeight: 1.2,
                        color: active ? '#ffffff' : MOBILE_TOKENS.colors.text,
                        fontFamily: 'system-ui,sans-serif' }}>{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Theme picker */}
              <div style={{ padding: `${MOBILE_TOKENS.spacing.lg}px`, background: resolvedTheme === 'light' ? '#ffffff' : '#1e293b', borderRadius: MOBILE_TOKENS.radius.xl, border: `1px solid ${MOBILE_TOKENS.colors.border}`, margin: `${MOBILE_TOKENS.spacing.lg}px` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: MOBILE_TOKENS.spacing.md, marginBottom: `${MOBILE_TOKENS.spacing.lg}px` }}>
                  <Palette style={{ width: '1.25rem', height: '1.25rem', color: currentTheme.color }} />
                  <span style={{ fontSize: '0.95rem', fontWeight: 700, color: MOBILE_TOKENS.colors.text,
                    fontFamily: 'system-ui,sans-serif' }}>Appearance</span>
                  <span style={{ marginLeft: 'auto', fontSize: '0.8rem', fontWeight: 700,
                    padding: `${MOBILE_TOKENS.spacing.xs * 0.2}rem ${MOBILE_TOKENS.spacing.md * 0.5}px`, borderRadius: MOBILE_TOKENS.radius.full,
                    background: `${currentTheme.color}20`, color: currentTheme.color }}>
                    {currentTheme.label}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: `${MOBILE_TOKENS.spacing.xs}px`, flexWrap: 'wrap' }}>
                  {THEME_OPTIONS.map(opt => {
                    const isActive = theme === opt.id;
                    const isLightTheme = opt.id === 'light' || opt.id === 'warm' || opt.id === 'ocean' || opt.id === 'emerald' || opt.id === 'rosewood';
                    const iconColor = isLightTheme ? '#000000' : '#ffffff';
                    const Icon = opt.icon;
                    return (
                      <button key={opt.id} type="button" onClick={() => setTheme(opt.id)}
                        aria-label={opt.label}
                        style={{ flex: '1 1 calc(50% - 4px)', display: 'flex', flexDirection: 'column', alignItems: 'center',
                          gap: `${MOBILE_TOKENS.spacing.xs * 0.5}px`, padding: `${MOBILE_TOKENS.spacing.md}px ${MOBILE_TOKENS.spacing.xs}px`, borderRadius: MOBILE_TOKENS.radius.md, border: 'none', cursor: 'pointer',
                          background: isActive ? `${opt.color}18` : 'transparent',
                          outline: isActive ? `2px solid ${opt.color}` : '2px solid transparent',
                          transition: 'all 0.15s' }}>
                        <div style={{ width: '2rem', height: '2rem', borderRadius: '50%', background: opt.color,
                          boxShadow: isActive ? `0 0 12px ${opt.color}80` : 'none',
                          transition: 'box-shadow 0.15s',
                          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Icon style={{ width: '1rem', height: '1rem', color: iconColor, strokeWidth: 2.5 }} />
                        </div>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700,
                          color: isActive ? opt.color : 'var(--muted-foreground)',
                          fontFamily: 'system-ui,sans-serif' }}>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Display density / font size settings */}
              <div style={{ margin: `0 ${MOBILE_TOKENS.spacing.lg}px ${MOBILE_TOKENS.spacing.lg}px`, padding: MOBILE_TOKENS.spacing.lg, borderRadius: MOBILE_TOKENS.radius.lg,
                background: resolvedTheme === 'light' ? '#ffffff' : '#1e293b', border: `1px solid var(--border)` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: MOBILE_TOKENS.spacing.md, marginBottom: `${MOBILE_TOKENS.spacing.lg}px` }}>
                  <svg width="1.25rem" height="1.25rem" viewBox="0 0 24 24" fill="none" stroke="var(--muted-foreground)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
                  </svg>
                  <span style={{ fontSize: '0.95rem', fontWeight: 700, color: MOBILE_TOKENS.colors.text, fontFamily: 'system-ui,sans-serif' }}>Display Size</span>
                </div>
                <div style={{ display: 'flex', gap: `${MOBILE_TOKENS.spacing.xs}px` }}>
                  {([
                    { id: 'compact', label: 'Compact', icon: 'A', size: '0.85rem' },
                    { id: 'medium',  label: 'Medium',  icon: 'A', size: '1.08rem' },
                    { id: 'large',   label: 'Large',   icon: 'A', size: '1.38rem' },
                  ] as { id: DisplayScale; label: string; icon: string; size: string }[]).map(opt => {
                    const active = scale === opt.id;
                    return (
                      <button key={opt.id} type="button" onClick={() => setScale(opt.id)}
                        style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                          gap: `${MOBILE_TOKENS.spacing.xs * 0.5}px`, padding: `${MOBILE_TOKENS.spacing.md}px ${MOBILE_TOKENS.spacing.xs}px`, borderRadius: MOBILE_TOKENS.radius.md, border: `1.5px solid ${active ? 'var(--primary)' : 'var(--border)'}`, cursor: 'pointer',
                          background: active ? `var(--primary)30` : (resolvedTheme === 'light' ? '#f3f4f6' : '#2d3748'),
                          transition: 'all 0.15s' }}>
                        <span style={{ fontSize: opt.size, fontWeight: 800, color: active ? 'var(--primary)' : 'var(--foreground)', lineHeight: 1, fontFamily: 'system-ui,sans-serif' }}>
                          {opt.icon}
                        </span>
                        <span style={{ fontSize: '0.7rem', fontWeight: 600, color: active ? 'var(--primary)' : 'var(--muted-foreground)', fontFamily: 'system-ui,sans-serif' }}>
                          {opt.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sign out */}
              <div style={{ margin: `0 ${MOBILE_TOKENS.spacing.lg}px ${MOBILE_TOKENS.spacing.lg}px` }}>
                <button type="button" onClick={() => setConfirmSignOutVisible(true)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: `${MOBILE_TOKENS.spacing.lg}px ${MOBILE_TOKENS.spacing.lg}px`, borderRadius: MOBILE_TOKENS.radius.lg, cursor: 'pointer',
                    background: resolvedTheme === 'light' ? '#fff1f1' : '#2d1a1a', border: '1.5px solid rgba(239,68,68,0.2)', transition: 'all 0.2s' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: `${MOBILE_TOKENS.spacing.md}px` }}>
                    <div style={{ width: '2.6rem', height: '2.6rem', borderRadius: MOBILE_TOKENS.radius.md,
                      background: 'rgba(239,68,68,0.15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <LogOut style={{ width: '1.3rem', height: '1.3rem', color: 'var(--destructive)' }} />
                    </div>
                    <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--destructive)',
                      fontFamily: 'system-ui,sans-serif' }}>Sign Out</span>
                  </div>
                  <ChevronRight style={{ width: '1.3rem', height: '1.3rem', color: 'rgba(248,113,113,0.5)' }} />
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
              background: MOBILE_TOKENS.colors.surface,
              borderRadius: `${MOBILE_TOKENS.radius.xl}px ${MOBILE_TOKENS.radius.xl}px 0 0`,
              padding: `${MOBILE_TOKENS.spacing.xs}px ${MOBILE_TOKENS.spacing.lg}px 0`,
              paddingBottom: `calc(${MOBILE_TOKENS.safeAreaBottom} + ${MOBILE_TOKENS.spacing.lg}px)`,
              boxShadow: '0 -12px 48px rgba(0,0,0,0.4)' }}>
            <div style={{ display: 'flex', justifyContent: 'center', padding: `${MOBILE_TOKENS.spacing.md}px 0 ${MOBILE_TOKENS.spacing.lg * 0.6}px` }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: MOBILE_TOKENS.colors.borderLight }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: MOBILE_TOKENS.spacing.lg }}>
              <div style={{ width: 56, height: 56, borderRadius: MOBILE_TOKENS.radius.lg,
                background: 'rgba(239,68,68,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <LogOut style={{ width: 26, height: 26, color: 'var(--destructive)' }} />
              </div>
            </div>
            <div style={{ textAlign: 'center', marginBottom: MOBILE_TOKENS.spacing.lg * 1.5 }}>
              <p style={{ margin: `0 0 ${MOBILE_TOKENS.spacing.xs}px`, fontSize: 18, fontWeight: 800, color: MOBILE_TOKENS.colors.text,
                fontFamily: 'system-ui,sans-serif' }}>Sign Out?</p>
              <p style={{ margin: 0, fontSize: 13, color: MOBILE_TOKENS.colors.textMuted,
                fontFamily: 'system-ui,sans-serif', lineHeight: 1.5 }}>
                You'll need to sign in again to access your account.
              </p>
            </div>
            <div style={{ display: 'flex', gap: MOBILE_TOKENS.spacing.md, marginBottom: MOBILE_TOKENS.spacing.xs }}>
              <button type="button" onClick={() => setConfirmSignOutVisible(false)}
                style={{ flex: 1, height: 50, borderRadius: MOBILE_TOKENS.radius.lg, cursor: 'pointer',
                  background: 'var(--muted)',
                  border: `1px solid var(--border)`,
                  color: MOBILE_TOKENS.colors.text, fontSize: 15, fontWeight: 600,
                  fontFamily: 'system-ui,sans-serif' }}>
                Cancel
              </button>
              <button type="button" onClick={() => { setConfirmSignOutVisible(false); signOut(); }}
                style={{ flex: 1, height: 50, borderRadius: MOBILE_TOKENS.radius.lg, cursor: 'pointer',
                  background: MOBILE_TOKENS.colors.error,
                  border: 'none',
                  color: 'var(--destructive-foreground)', fontSize: 15, fontWeight: 700,
                  fontFamily: 'system-ui,sans-serif',
                  boxShadow: `0 4px 16px rgba(220,38,38,0.3)` }}>
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
            <div style={{ width: '100%', background: MOBILE_TOKENS.colors.surface,
              borderRadius: `${MOBILE_TOKENS.radius.xl}px ${MOBILE_TOKENS.radius.xl}px 0 0`, padding: `${MOBILE_TOKENS.spacing.lg}px ${MOBILE_TOKENS.spacing.lg}px`,
              paddingBottom: `calc(${MOBILE_TOKENS.safeAreaBottom} + ${MOBILE_TOKENS.spacing.lg}px)`,
              boxShadow: '0 -12px 60px rgba(0,0,0,0.4)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: MOBILE_TOKENS.spacing.lg, marginBottom: MOBILE_TOKENS.spacing.lg }}>
                <div style={{ width: 44, height: 44, borderRadius: MOBILE_TOKENS.radius.lg, flexShrink: 0,
                  background: 'rgba(239,68,68,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertCircle style={{ width: 22, height: 22, color: 'var(--destructive)' }} />
                </div>
                <div>
                  <p style={{ margin: `0 0 ${MOBILE_TOKENS.spacing.xs}px`, fontSize: 16, fontWeight: 700, color: MOBILE_TOKENS.colors.text,
                    fontFamily: 'system-ui,sans-serif' }}>Subscription Expired</p>
                  <p style={{ margin: 0, fontSize: 13, color: MOBILE_TOKENS.colors.textMuted,
                    fontFamily: 'system-ui,sans-serif' }}>Renew to continue using BillVyapar.</p>
                  {typeof daysRemaining === 'number' && daysRemaining >= 0 && (
                    <p style={{ margin: `${MOBILE_TOKENS.spacing.xs}px 0 0`, fontSize: 12, color: MOBILE_TOKENS.colors.textSecondary,
                      fontFamily: 'system-ui,sans-serif' }}>Days remaining: {daysRemaining}</p>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: MOBILE_TOKENS.spacing.md }}>
                <button type="button" onClick={() => navigate('/subscription')}
                  style={{ flex: 1, height: 50, borderRadius: MOBILE_TOKENS.radius.lg, border: 'none', cursor: 'pointer',
                    background: MOBILE_TOKENS.colors.accent, color: 'var(--primary-foreground)',
                    fontSize: 15, fontWeight: 700, fontFamily: 'system-ui,sans-serif',
                    boxShadow: `0 4px 16px rgba(79,70,229,0.4)` }}>
                  Renew Now
                </button>
                <button type="button" onClick={signOut}
                  style={{ flex: 1, height: 50, borderRadius: MOBILE_TOKENS.radius.lg, cursor: 'pointer',
                    background: 'var(--muted)', border: `1px solid var(--border)`,
                    color: MOBILE_TOKENS.colors.text, fontSize: 15, fontWeight: 600,
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
