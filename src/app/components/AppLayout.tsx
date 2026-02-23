import { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { Button } from './ui/button';
import {
  LayoutDashboard,
  FileText,
  Users,
  Package,
  BarChart3,
  Building2,
  Menu,
  AlertCircle,
  Receipt,
  CreditCard,
  LogOut,
  Settings,
  Crown,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet';
import { useState, useEffect } from 'react';
import { API_URL } from '../config/api';
import { toast } from 'sonner';
import { WalkthroughDialog } from './WalkthroughDialog';
import {
  cacheSubscriptionToken,
  validateSubscriptionOffline,
  validateSubscriptionTokenOnline,
} from '../utils/subscriptionValidation';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut, accessToken, deviceId } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [walkthroughOpen, setWalkthroughOpen] = useState(false);
  const [subscriptionWarning, setSubscriptionWarning] = useState<string | null>(null);
  const [subscriptionExpired, setSubscriptionExpired] = useState(false);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const [profileGateChecked, setProfileGateChecked] = useState(false);

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

  const currentProfile = readCurrentProfile();

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
    setSubscriptionExpired(true);
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
      if (!accessToken) return;
      const profileId = readCurrentProfile()?.id;
      if (!profileId) return;

      try {
        const online = await validateSubscriptionTokenOnline({
          apiUrl: API_URL,
          accessToken,
          deviceId,
          profileId,
        });
        if (online.ok && online.token) {
          cacheSubscriptionToken(profileId, online.token);
        }
      } catch {
        // ignore (offline)
      }
    };

    run();
  }, [accessToken, deviceId, location.pathname]);

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
        navigate('/profiles');
        setProfileGateChecked(true);
        return;
      }

      try {
        const online = await validateSubscriptionTokenOnline({
          apiUrl: API_URL,
          accessToken,
          deviceId,
          profileId,
        });

        if (online.ok && online.token) {
          cacheSubscriptionToken(profileId, online.token);
          const offlineResult = await validateSubscriptionOffline(profileId);
          applySubscriptionResult(offlineResult, 'network');
          if (offlineResult.status !== 'ok' && offlineResult.status !== 'no_cache_allow') {
            navigate('/welcome');
            setProfileGateChecked(true);
            return;
          }
        }

        const subCheck = await validateSubscriptionOffline(profileId);
        applySubscriptionResult(subCheck, 'network');
        if (subCheck.status !== 'ok' && subCheck.status !== 'no_cache_allow') {
          navigate('/welcome');
          setProfileGateChecked(true);
          return;
        }
        setProfileGateChecked(true);
      } catch {
        const subCheck = await validateSubscriptionOffline(profileId);
        applySubscriptionResult(subCheck, 'cache');
        if (subCheck.status !== 'ok' && subCheck.status !== 'no_cache_allow') {
          navigate('/welcome');
          setProfileGateChecked(true);
          return;
        }
        setProfileGateChecked(true);
      }
    };

    run();
  }, [accessToken, deviceId, location.pathname, navigate]);

  useEffect(() => {
    if (!profileGateChecked) return;
    if (!accessToken) return;

    const profileId = readCurrentProfile()?.id;
    if (!profileId) return;

    const key = `walkthroughSeen:${profileId}`;
    if (localStorage.getItem(key) === '1') return;
    setWalkthroughOpen(true);
  }, [accessToken, profileGateChecked, location.pathname]);

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: FileText, label: 'Documents', path: '/documents' },
    { icon: Users, label: 'Parties', path: '/customers', matchPrefixes: ['/customers', '/suppliers'] as const },
    { icon: Package, label: 'Items', path: '/items' },
    { icon: BarChart3, label: 'Analytics', path: '/analytics' },
    { icon: Receipt, label: 'GST Reports', path: '/reports/gst' },
    { icon: CreditCard, label: 'Subscription', path: '/subscription' },
  ];

  const NavigationMenu = () => (
    <nav className="space-y-1">
      {menuItems.map((item) => {
        const Icon = item.icon;
        const isActive = Array.isArray((item as any).matchPrefixes)
          ? ((item as any).matchPrefixes as readonly string[]).some((p) => location.pathname.startsWith(p))
          : location.pathname === item.path;
        
        return (
          <button
            key={item.path}
            onClick={() => {
              navigate(item.path);
              setMobileMenuOpen(false);
            }}
            className={`group travel-glow border-glow border-glow-hover w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              isActive
                ? `bg-blue-50 text-blue-600 shadow-sm travel-glow-active border-glow-active`
                : `text-gray-700 hover:bg-blue-50 hover:text-blue-600`
            }`}
          >
            <span
              className={`icon-aura icon-aura-hover ${isActive ? 'icon-aura-active' : ''}`}
            >
              <Icon
                className={`h-5 w-5 neon-target neon-hover ${isActive ? 'neon-active' : ''}`}
              />
            </span>
            <span
              className={`font-medium neon-target neon-hover travel-glow-text travel-glow-text-hover ${
                isActive ? 'neon-active travel-glow-text-active' : ''
              }`}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );

  return (
    <div className="flex h-screen bg-gray-50">
      <WalkthroughDialog
        open={walkthroughOpen}
        onOpenChange={(open) => {
          setWalkthroughOpen(open);
          if (!open) {
            const profileId = readCurrentProfile()?.id;
            if (profileId) localStorage.setItem(`walkthroughSeen:${profileId}`, '1');
          }
        }}
      />
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-64 bg-white border-r border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Hukum</h1>
          </div>
          {currentProfile.businessName && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Building2 className="h-4 w-4 text-blue-600" />
                <p className="text-sm font-semibold text-gray-900">{currentProfile.businessName}</p>
              </div>
              <p className="text-xs text-gray-600">{currentProfile.ownerName}</p>
            </div>
          )}
        </div>

        <div className="flex-1 p-4 overflow-y-auto">
          <NavigationMenu />
        </div>

        <div className="p-4 border-t border-gray-200 space-y-3">
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start"
            onClick={() => setWalkthroughOpen(true)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Tour
          </Button>
          <button
            type="button"
            onClick={() => {
              if (subscriptionExpired) return;
              navigate('/profiles');
            }}
            className={`w-full flex items-center gap-3 rounded-lg p-2 transition-colors ${
              subscriptionExpired ? 'cursor-not-allowed opacity-60' : 'hover:bg-gray-50'
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
              <p className="text-sm font-semibold text-gray-900 truncate">
                {currentProfile?.businessName || 'Profile'}
              </p>
              <p className="text-xs text-gray-600 truncate">Manage profiles</p>
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

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-blue-600" />
            <h1 className="text-xl font-bold">Hukum</h1>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setWalkthroughOpen(true)}
            className="mr-2"
          >
            Tour
          </Button>
          
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="h-8 w-8 text-blue-600" />
                  <h1 className="text-2xl font-bold text-gray-900">Hukum</h1>
                </div>
                {currentProfile.businessName && (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Building2 className="h-4 w-4 text-blue-600" />
                      <p className="text-sm font-semibold text-gray-900">{currentProfile.businessName}</p>
                    </div>
                    <p className="text-xs text-gray-600">{currentProfile.ownerName}</p>
                  </div>
                )}
              </div>

              <div className="flex-1 p-4">
                <NavigationMenu />
              </div>

              <div className="p-4 border-t border-gray-200 space-y-3">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setWalkthroughOpen(true);
                  }}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Tour
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    if (subscriptionExpired) return;
                    navigate('/profiles');
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 rounded-lg p-2 transition-colors ${
                    subscriptionExpired ? 'cursor-not-allowed opacity-60' : 'hover:bg-gray-50'
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
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {currentProfile?.businessName || 'Profile'}
                    </p>
                    <p className="text-xs text-gray-600 truncate">Manage profiles</p>
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
        <main className="flex-1 overflow-y-auto">
          {!profileGateChecked ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading...</p>
              </div>
            </div>
          ) : (
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
              {subscriptionExpired && location.pathname !== '/subscription' && location.pathname !== '/dashboard' && location.pathname !== '/welcome' && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-gray-200 p-6">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-6 w-6 text-red-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-lg font-semibold text-gray-900">Subscription Expired</p>
                        <p className="text-sm text-gray-600 mt-1">
                          Your subscription has expired. Renew to continue using the service.
                        </p>
                        {typeof daysRemaining === 'number' && (
                          <p className="text-xs text-gray-500 mt-2">
                            Days remaining: {daysRemaining}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-3 mt-6">
                      <Button className="flex-1" onClick={() => navigate('/subscription')}>
                        Renew Now
                      </Button>
                      <Button variant="outline" className="flex-1" onClick={signOut}>
                        Sign Out
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              {children}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
