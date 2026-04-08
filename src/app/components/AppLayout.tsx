import { ReactNode, useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { Button } from './ui/button';
import {
  LayoutDashboard,
  FileText,
  ShoppingCart,
  Users,
  Package,
  BarChart3,
  Building2,
  Menu,
  AlertCircle,
  Receipt,
  CreditCard,
  Landmark,
  LogOut,
  Crown,
  Truck,
  Plus,
  ChevronDown,
  Sun,
  Moon,
  Monitor,
  Droplet,
  Leaf,
  Flame,
  Maximize2,
  Minimize2,
  UserCog,
  HelpCircle,
  MoreVertical,
} from 'lucide-react';
const logoImg = './logo.png';
import { useAuth } from '../contexts/AuthContext';
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet';
import { API_URL } from '../config/api';
import { toast } from 'sonner';
import { GuidedTour } from './GuidedTour';
import { useTour } from '../contexts/TourContext';
import { useTheme, type ThemeMode } from '../contexts/ThemeContext';
import { TraceLoader } from './TraceLoader';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
  DropdownMenuItem,
} from './ui/dropdown-menu';
import {
  cacheSubscriptionToken,
  validateSubscriptionOffline,
  validateSubscriptionTokenOnline,
} from '../utils/subscriptionValidation';
import { useIsNative } from '../hooks/useIsNative';
import { MobileLayout } from './MobileLayout';
import { prefetchRoute } from '../hooks/usePrefetch';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut, accessToken, deviceId } = useAuth();
  const { theme, setTheme } = useTheme();
  const isNative = useIsNative();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isTourOpen, startTour, endTour } = useTour();
  const [subscriptionWarning, setSubscriptionWarning] = useState<string | null>(null);
  const [subscriptionExpired, setSubscriptionExpired] = useState(false);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const sidebarHideTimer = useRef<number | null>(null);

  // Auto-hide sidebar after 2s on mount
  useEffect(() => {
    sidebarHideTimer.current = window.setTimeout(() => setSidebarVisible(false), 2000);
    return () => { if (sidebarHideTimer.current) clearTimeout(sidebarHideTimer.current); };
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);
  // Start as true if we already have a profile cached â€” avoids spinner flash on every nav
  const [profileGateChecked, setProfileGateChecked] = useState(() => {
    try {
      const raw = localStorage.getItem('currentProfile');
      if (!raw) return false;
      const p = JSON.parse(raw);
      return !!(typeof p === 'string' ? JSON.parse(p) : p)?.id;
    } catch { return false; }
  });

  const readCurrentProfile = () => {
    const raw = localStorage.getItem('currentProfile');
    if (!raw) return {} as any;

    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'string') {
        try {
          return JSON.parse(parsed);
        } catch {
          return {} as any;
        }
      }
      return parsed || ({} as any);
    } catch {
      return {} as any;
    }
  };

  const [currentProfile, setCurrentProfile] = useState<any>(() => readCurrentProfile());

  // On every mount: validate the stored profile is still valid, auto-recover if stale
  useEffect(() => {
    const profileId = readCurrentProfile()?.id;
    if (!accessToken || !deviceId) return;

    const resolveProfile = async () => {
      if (!profileId) return; // no profile stored â€” subscription gate handles this

      try {
        // Fetch all profiles and find the stored one
        const r = await fetch(`${API_URL}/profiles`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'X-Device-ID': deviceId,
          },
        });

        if (!r.ok) return; // network/server error â€” keep existing local state

        const profiles = await r.json().catch(() => null);
        if (!Array.isArray(profiles)) return;

        const match = profiles.find((p: any) => p.id === profileId);
        if (match) {
          // Profile still valid â€” refresh local data
          localStorage.setItem('currentProfile', JSON.stringify(match));
          setCurrentProfile(match);
          window.dispatchEvent(new CustomEvent('profileRefreshed', { detail: match }));
        } else if (profiles.length > 0) {
          // Stored profile no longer exists (or belongs to different user) â€” auto-select first
          const first = profiles[0];
          localStorage.setItem('currentProfile', JSON.stringify(first));
          setCurrentProfile(first);
          // Dispatch profileChanged first to clear stale data, then profileRefreshed with new data
          window.dispatchEvent(new CustomEvent('profileChanged', { detail: { profileId: first.id } }));
          window.dispatchEvent(new CustomEvent('profileRefreshed', { detail: first }));
        } else {
          // No profiles at all â€” redirect to create one
          localStorage.removeItem('currentProfile');
          setCurrentProfile({});
          window.dispatchEvent(new CustomEvent('profileChanged', { detail: { profileId: null } }));
          navigate('/profiles');
        }
      } catch {
        // Network error â€” keep existing local state silently
      }
    };

    resolveProfile().catch(() => {});
  }, [accessToken, deviceId]);

  const GlobalActionsMenu = ({ compact }: { compact?: boolean }) => {
    const themeIcon =
      theme === 'dark'
        ? Moon
        : theme === 'warm'
          ? Crown
          : theme === 'ocean'
            ? Droplet
            : theme === 'emerald'
              ? Leaf
              : theme === 'rosewood'
                ? Flame
                : theme === 'light'
                  ? Sun
                  : Monitor;
    const ThemeIcon = themeIcon;

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Menu"
            title="Menu"
            className={compact ? 'h-8 w-8' : 'h-9 w-9'}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="flex items-center justify-between">
            <span>Utility Menu</span>
            <span className="text-[10px] font-normal px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">V1</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <ThemeIcon className="mr-2 h-4 w-4" />
              <span>Theme</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                <DropdownMenuRadioGroup value={theme} onValueChange={(v) => setTheme(v as ThemeMode)}>
                  <DropdownMenuRadioItem value="light">
                    <Sun className="mr-2 h-4 w-4" />
                    Light
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="warm">
                    <Crown className="mr-2 h-4 w-4" />
                    Warm
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="ocean">
                    <Droplet className="mr-2 h-4 w-4" />
                    Ocean
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="emerald">
                    <Leaf className="mr-2 h-4 w-4" />
                    Emerald
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="rosewood">
                    <Flame className="mr-2 h-4 w-4" />
                    Rosewood
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="dark">
                    <Moon className="mr-2 h-4 w-4" />
                    Dark
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="system">
                    <Monitor className="mr-2 h-4 w-4" />
                    System
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>

          <DropdownMenuItem onClick={toggleFullscreen}>
            {isFullscreen ? <Minimize2 className="mr-2 h-4 w-4" /> : <Maximize2 className="mr-2 h-4 w-4" />}
            <span>{isFullscreen ? 'Fullscreen' : 'Fullscreen'}</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem 
            onClick={() => isTourOpen ? endTour() : startTour()}
            className={isTourOpen ? "text-red-600 focus:text-red-600" : "text-blue-600 focus:text-blue-600"}
          >
            {isTourOpen ? <LogOut className="mr-2 h-4 w-4" /> : <Truck className="mr-2 h-4 w-4" />}
            <span>{isTourOpen ? 'Exit Demo Mode' : 'Interactive Walkthrough'}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  const applySubscriptionResult = (
    result: { status: 'ok' | 'expired' | 'offline_too_long' | 'time_tamper' | 'token_invalid' | 'no_cache_allow' | 'profile_mismatch'; daysRemaining: number | null; message?: string },
    source: 'network' | 'cache'
  ) => {
    if (result.status === 'ok' || result.status === 'no_cache_allow') {
      const remaining = result.daysRemaining;
      if (typeof remaining === 'number') {
        setDaysRemaining(remaining);
        if (remaining <= 10) {
          const msg = `Subscription expiring in ${remaining} day${remaining === 1 ? '' : 's'}. Please renew.`;
          setSubscriptionWarning(msg);
          showSubscriptionToastOncePerDay(msg, 'info');
        } else {
          setSubscriptionWarning(null);
        }
      } else {
        setDaysRemaining(null);
        setSubscriptionWarning(null);
      }
      setSubscriptionExpired(false);
      return;
    }

    const msg = result.message || 'Subscription expired. Please renew to continue service.';
    setSubscriptionWarning(msg);

    // FIX: If we have valid days remaining, don't lock the user out (even on offline_too_long)
    if (typeof result.daysRemaining === 'number' && result.daysRemaining > 0) {
      setDaysRemaining(result.daysRemaining);
      setSubscriptionExpired(false);
    } else {
      setSubscriptionExpired(true);
    }

    showSubscriptionToastOncePerDay(
      source === 'cache' ? `${msg} (offline check)` : msg,
      'error'
    );
  };

  const showSubscriptionToastOncePerDay = (message: string, level: 'info' | 'error') => {
    const today = new Date().toISOString().slice(0, 10);
    const key = `subscriptionToast:${today}:${level}:${message}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
    if (level === 'error') toast.error(message);
    else toast.info(message);
  };

  useEffect(() => {
    const run = async () => {
      if (!accessToken) {
        setProfileGateChecked(true);
        return;
      }

      const path = location.pathname;
      if (path === '/profiles' || path === '/subscription' || path === '/welcome') {
        setProfileGateChecked(true);
        return;
      }

      const profileId = readCurrentProfile()?.id;
      if (!profileId) {
        // Don't redirect here â€” the profile resolution effect handles it
        // Just mark gate as checked so content can render
        setProfileGateChecked(true);
        return;
      }

      // â”€â”€ Cache-first on both native and web: show content instantly, revalidate in background â”€â”€
      const subCheck = await validateSubscriptionOffline(profileId);
      applySubscriptionResult(subCheck, 'cache');
      if (subCheck.status !== 'ok' && subCheck.status !== 'no_cache_allow') {
        navigate('/welcome');
      }
      setProfileGateChecked(true);

      // Background network revalidation â€” never blocks the UI
      validateSubscriptionTokenOnline({ apiUrl: API_URL, accessToken, deviceId, profileId })
        .then(async (online) => {
          if (online.ok && online.token) {
            cacheSubscriptionToken(profileId, online.token);
            const fresh = await validateSubscriptionOffline(profileId);
            applySubscriptionResult(fresh, 'network');
            if (fresh.status !== 'ok' && fresh.status !== 'no_cache_allow') {
              navigate('/welcome');
            }
          }
        })
        .catch(() => {});
    };

    run();
  }, [accessToken, deviceId]);

  useEffect(() => {
    if (!profileGateChecked) return;
    if (!accessToken) return;

    const profileId = readCurrentProfile()?.id;
    if (!profileId) return;

    const key = `walkthroughSeen:${profileId}`;
    if (localStorage.getItem(key) === '1') return;
    startTour();
  }, [accessToken, profileGateChecked, location.pathname]);

  useEffect(() => {
    const p = location.pathname;

    const store = (key: string) => {
      try {
        sessionStorage.setItem(key, p);
      } catch {
        // ignore
      }
    };

    if (p === '/dashboard') store('nav:lastDashboardRoute');
    if (p === '/documents' || p.startsWith('/documents/')) store('nav:lastDocumentsRoute');
    if (p === '/customers' || p.startsWith('/customers/') || p === '/suppliers' || p.startsWith('/suppliers/')) store('nav:lastPartiesRoute');
    if (p === '/items' || p.startsWith('/items/')) store('nav:lastItemsRoute');
    if (p === '/analytics' || p.startsWith('/analytics/')) store('nav:lastAnalyticsRoute');
    if (p === '/reports/gst' || p.startsWith('/reports/')) store('nav:lastReportsRoute');
    if (p === '/ledger' || p.startsWith('/ledger/')) store('nav:lastLedgerRoute');
    if (p === '/subscription' || p.startsWith('/subscription/')) store('nav:lastSubscriptionRoute');
  }, [location.pathname]);

  const readLastRoute = (key: string, fallback: string, allowPrefixes: readonly string[]) => {
    try {
      const last = sessionStorage.getItem(key);
      if (!last) return fallback;
      if (last === fallback) return last;
      if (allowPrefixes.some((p) => last === p || last.startsWith(p))) return last;
      return fallback;
    } catch {
      return fallback;
    }
  };

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: FileText, label: 'Documents', path: '/documents' },
    { icon: Users, label: 'Parties', path: '/customers', matchPrefixes: ['/customers', '/suppliers'] as const },
    { icon: Package, label: 'Items', path: '/items' },
    { icon: BarChart3, label: 'Analytics', path: '/analytics' },
    { icon: Receipt, label: 'GST Reports', path: '/reports/gst' },
    { icon: CreditCard, label: 'Ledger', path: '/ledger' },
    { icon: Landmark, label: 'Bank Accounts', path: '/bank-accounts' },
    { icon: UserCog, label: 'Employees', path: '/employees' },
    { icon: CreditCard, label: 'Subscription', path: '/subscription' },
  ];

  const menuTourId = (path: string) => {
    if (path === '/dashboard') return 'nav-dashboard';
    if (path === '/documents') return 'nav-documents';
    if (path === '/customers') return 'nav-parties';
    if (path === '/items') return 'nav-items';
    if (path === '/analytics') return 'nav-analytics';
    if (path === '/reports/gst') return 'nav-gst';
    if (path === '/ledger') return 'nav-ledger';
    if (path === '/bank-accounts') return 'nav-bank-accounts';
    if (path === '/subscription') return 'nav-subscription';
    return undefined;
  };

  const NavigationMenu = () => (
    <nav className="space-y-1">
      {menuItems.map((item) => {
        const Icon = item.icon;
        const isActive = Array.isArray((item as any).matchPrefixes)
          ? ((item as any).matchPrefixes as readonly string[]).some((p) => location.pathname.startsWith(p))
          : location.pathname === item.path;
        
        return (
          <div key={item.path} className="space-y-1">
            <button
              data-tour-id={menuTourId(item.path)}
              onMouseEnter={() => prefetchRoute(item.path)}
              onClick={() => {
                if (item.path === '/dashboard') {
                  navigate(readLastRoute('nav:lastDashboardRoute', '/dashboard', ['/dashboard']));
                } else if (item.path === '/documents') {
                  navigate(readLastRoute('nav:lastDocumentsRoute', '/documents', ['/documents/']));
                } else if (item.path === '/customers') {
                  navigate(readLastRoute('nav:lastPartiesRoute', '/customers', ['/customers/', '/suppliers/']));
                } else if (item.path === '/items') {
                  navigate(readLastRoute('nav:lastItemsRoute', '/items', ['/items/']));
                } else if (item.path === '/analytics') {
                  navigate(readLastRoute('nav:lastAnalyticsRoute', '/analytics', ['/analytics/']));
                } else if (item.path === '/reports/gst') {
                  navigate(readLastRoute('nav:lastReportsRoute', '/reports/gst', ['/reports/']));
                } else if (item.path === '/ledger') {
                  navigate(readLastRoute('nav:lastLedgerRoute', '/ledger', ['/ledger/']));
                } else if (item.path === '/subscription') {
                  navigate(readLastRoute('nav:lastSubscriptionRoute', '/subscription', ['/subscription/']));
                } else {
                  navigate(item.path);
                }
                setMobileMenuOpen(false);
              }}
              className={`group travel-glow border-glow border-glow-hover w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                isActive
                  ? `bg-muted text-primary shadow-sm travel-glow-active border-glow-active`
                  : `text-muted-foreground hover:bg-muted hover:text-primary`
              }`}
            >
              <span className={`icon-aura icon-aura-hover ${isActive ? 'icon-aura-active' : ''}`}>
                <Icon className={`h-5 w-5 neon-target neon-hover ${isActive ? 'neon-active' : ''}`} />
              </span>
              <span
                className={`font-medium neon-target neon-hover travel-glow-text travel-glow-text-hover ${
                  isActive ? 'neon-active travel-glow-text-active' : ''
                }`}
              >
                {item.label}
              </span>
            </button>

            {item.path === '/documents' && (
              <div className="pl-4">
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="group travel-glow border-glow border-glow-hover w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all text-muted-foreground hover:bg-muted hover:text-primary"
                    >
                      <span className="icon-aura icon-aura-hover">
                        <ShoppingCart className="h-5 w-5 neon-target neon-hover" />
                      </span>
                      <span className="flex-1 text-left font-medium neon-target neon-hover travel-glow-text travel-glow-text-hover">
                        Sales
                      </span>
                      <ChevronDown className="h-4 w-4 opacity-70" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent side="right" align="start" className="w-72 p-2">
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Sales</div>
                    <div className="space-y-1">
                      {[
                        { label: 'Sale Invoices', type: 'invoice' },
                        { label: 'Estimate / Quotation', type: 'quotation' },
                        { label: 'Proforma Invoice', type: 'proforma' },
                        { label: 'Sale Order', type: 'order' },
                        { label: 'Delivery Challan', type: 'challan' },
                        { label: 'Sale Return / Credit Note', type: 'invoice_cancellation' },
                      ].map((row) => (
                        <div
                          key={row.type}
                          className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted"
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            navigate(`/documents?type=${encodeURIComponent(row.type)}`);
                            setMobileMenuOpen(false);
                          }}
                          onKeyDown={(e) => {
                            if (e.key !== 'Enter' && e.key !== ' ') return;
                            e.preventDefault();
                            navigate(`/documents?type=${encodeURIComponent(row.type)}`);
                            setMobileMenuOpen(false);
                          }}
                        >
                          <div className="flex-1 text-left text-sm text-foreground/90 hover:text-primary">
                            {row.label}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              navigate(`/documents/create?type=${encodeURIComponent(row.type)}`);
                              setMobileMenuOpen(false);
                            }}
                            aria-label={`Create ${row.label}`}
                            title={`Create ${row.label}`}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <div className="h-px bg-border my-1" />
                      <div className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted">
                        <button
                          type="button"
                          className="flex-1 text-left text-sm text-foreground/90 hover:text-primary"
                          onClick={() => {
                            navigate('/vyapar-khata-new');
                            setMobileMenuOpen(false);
                          }}
                        >
                          Vyapar Khata
                        </button>
                      </div>
                      <div className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted">
                        <button
                          type="button"
                          className="flex-1 text-left text-sm text-foreground/90 hover:text-primary"
                          onClick={() => {
                            navigate('/pos');
                            setMobileMenuOpen(false);
                          }}
                        >
                          Vyapar POS
                        </button>
                      </div>
                      <div className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted">
                        <button
                          type="button"
                          className="flex-1 text-left text-sm text-foreground/90 hover:text-primary"
                          onClick={() => {
                            navigate('/extra-expenses');
                            setMobileMenuOpen(false);
                          }}
                        >
                          Extra Expense
                        </button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );

  return (
    <div className="flex h-screen bg-background">
      {/* â”€â”€ Native Android: delegate to MobileLayout â”€â”€ */}
      {isNative ? (
        // MobileLayout uses position:fixed inset-0 so it escapes this flex container
        <MobileLayout
          subscriptionWarning={subscriptionWarning}
          subscriptionExpired={subscriptionExpired}
          daysRemaining={daysRemaining}
          profileGateChecked={profileGateChecked}
        >
          {children}
        </MobileLayout>
      ) : (
      <>
      <GuidedTour
        open={isTourOpen}
        onOpenChange={(open) => {
          if (!open) {
            endTour();
            const profileId = readCurrentProfile()?.id;
            if (profileId) localStorage.setItem(`walkthroughSeen:${profileId}`, '1');
          } else {
            startTour();
          }
        }}
      />
      {/* Desktop Sidebar â€” auto-hides after 2s, shows on hover */}
      <aside
        className={`hidden lg:flex lg:flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 overflow-hidden ${sidebarVisible ? 'w-64' : 'w-0 border-r-0'}`}
        onMouseEnter={() => { setSidebarVisible(true); if (sidebarHideTimer.current) clearTimeout(sidebarHideTimer.current); }}
        onMouseLeave={() => { sidebarHideTimer.current = window.setTimeout(() => setSidebarVisible(false), 2000); }}
      >
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center gap-2 mb-4">
            <img src={logoImg} alt="BillVyapar" className="h-12 w-12 rounded-2xl shadow-sm object-contain" />
            <h1 className="text-2xl font-bold text-foreground">BillVyapar</h1>
            <div className="ml-auto flex items-center gap-2">
              <GlobalActionsMenu />
            </div>
          </div>
          {currentProfile.businessName && (
            <div className="bg-muted p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Building2 className="h-4 w-4 text-blue-600" />
                <p className="text-sm font-semibold text-foreground">{currentProfile.businessName}</p>
              </div>
              <p className="text-xs text-muted-foreground">{currentProfile.ownerName}</p>
            </div>
          )}
        </div>

        <div className="flex-1 p-4 overflow-y-auto">
          <NavigationMenu />
        </div>

        <div className="p-4 border-t border-sidebar-border space-y-3">
          <button
            type="button"
            data-tour-id="nav-profiles"
            onClick={() => {
              if (subscriptionExpired) return;
              navigate('/profiles');
            }}
            className={`w-full flex items-center gap-3 rounded-lg p-2 transition-colors ${
              subscriptionExpired ? 'cursor-not-allowed opacity-60' : 'hover:bg-muted'
            }`}
          >
            <div className="h-10 w-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold">
              {String(currentProfile?.businessName || 'P')
                .split(' ')
                .filter(Boolean)
                .slice(0, 2)
                .map((s: string) => s[0])
                .join('')
                .toUpperCase()}
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold text-foreground truncate">
                {currentProfile?.businessName || 'Profile'}
              </p>
              <p className="text-xs text-muted-foreground truncate">Manage profiles</p>
            </div>
          </button>
          <Button 
            variant="outline" 
            className="w-full justify-start text-red-600 hover:text-red-700"
            onClick={signOut}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Left-edge indicator â€” always visible, shows sidebar can be revealed */}
      <div
        className="hidden lg:flex fixed left-0 top-1/2 -translate-y-1/2 z-50 flex-col items-center gap-1 cursor-pointer"
        style={{ width: 6 }}
        onMouseEnter={() => { setSidebarVisible(true); if (sidebarHideTimer.current) clearTimeout(sidebarHideTimer.current); }}
        title="Show navigation"
      >
        {!sidebarVisible && (
          <>
            <div style={{ width: 4, height: 32, borderRadius: '0 4px 4px 0', background: 'rgba(99,102,241,0.7)', transition: 'all 0.2s' }} />
            <div style={{ width: 4, height: 16, borderRadius: '0 4px 4px 0', background: 'rgba(99,102,241,0.4)', transition: 'all 0.2s' }} />
            <div style={{ width: 4, height: 8, borderRadius: '0 4px 4px 0', background: 'rgba(99,102,241,0.2)', transition: 'all 0.2s' }} />
          </>
        )}
      </div>

      {/* Hover strip â€” reveals sidebar when it's hidden */}
      {!sidebarVisible && (
        <div
          className="hidden lg:block fixed left-0 top-0 h-full w-2 z-40 cursor-pointer"
          onMouseEnter={() => { setSidebarVisible(true); if (sidebarHideTimer.current) clearTimeout(sidebarHideTimer.current); }}
        />
      )}

      {/* Main Content â€” always fills remaining width */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden bg-background border-b border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1">
            <img src={logoImg} alt="BillVyapar" className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl shrink-0 shadow-sm object-contain" />
            <h1 className="text-xl font-bold">BillVyapar</h1>
            <div className="ml-auto flex items-center gap-2">
              <GlobalActionsMenu compact />
            </div>
          </div>
          
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" data-tour-id="mobile-menu-trigger">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <div className="p-6 border-b border-border">
                <div className="flex items-center gap-2 mb-4">
                  <img src={logoImg} alt="BillVyapar" className="h-12 w-12 rounded-2xl shrink-0 shadow-sm object-contain" />
                  <h1 className="text-2xl font-bold text-foreground">BillVyapar</h1>
                </div>
                {currentProfile.businessName && (
                  <div className="bg-muted p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Building2 className="h-4 w-4 text-blue-600" />
                      <p className="text-sm font-semibold text-foreground">{currentProfile.businessName}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{currentProfile.ownerName}</p>
                  </div>
                )}
              </div>

              <div className="flex-1 p-4">
                <NavigationMenu />
              </div>

              <div className="p-4 border-t border-border space-y-3">
                <button
                  type="button"
                  onClick={() => {
                    if (subscriptionExpired) return;
                    navigate('/profiles');
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 rounded-lg p-2 transition-colors ${
                    subscriptionExpired ? 'cursor-not-allowed opacity-60' : 'hover:bg-muted'
                  }`}
                >
                  <div className="h-10 w-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold">
                    {String(currentProfile?.businessName || 'P')
                      .split(' ')
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((s: string) => s[0])
                      .join('')
                      .toUpperCase()}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {currentProfile?.businessName || 'Profile'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">Manage profiles</p>
                  </div>
                </button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start text-red-600 hover:text-red-700"
                  onClick={signOut}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <>
            {subscriptionWarning && (
              <div className="mx-4 mt-4 mb-2 p-3 rounded-lg border border-yellow-200 bg-yellow-50 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-700 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-yellow-900">Subscription Notice</p>
                  <p className="text-sm text-yellow-800">{subscriptionWarning}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => navigate('/subscription')} className="border-yellow-300 text-yellow-900 hover:bg-yellow-100">
                  Renew
                </Button>
              </div>
            )}
            {subscriptionExpired && location.pathname !== '/subscription' && location.pathname !== '/dashboard' && location.pathname !== '/welcome' && location.pathname !== '/profiles' && (
              <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="w-full max-w-md bg-card text-card-foreground rounded-xl shadow-xl border border-border p-6">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-6 w-6 text-red-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-lg font-semibold text-foreground">Subscription Expired</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Your subscription has expired. Renew to continue using the service.
                      </p>
                    </div>
                  </div>
                  <div className="mt-6 flex gap-3">
                    <Button className="flex-1" onClick={() => navigate('/subscription')}>
                      Renew Subscription
                    </Button>
                    <Button variant="outline" className="flex-1" onClick={signOut}>
                      Sign Out
                    </Button>
                  </div>
                </div>
              </div>
            )}
            <div className="app-container">
              {children}
            </div>
          </>
        </main>
      </div>
      </>
      )}
    </div>
  );
}
