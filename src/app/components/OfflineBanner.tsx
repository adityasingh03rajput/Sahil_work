import { useEffect, useState } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

/**
 * OfflineBanner — shows a persistent banner when offline (like WhatsApp)
 * On native (Capacitor) the MobileLayout header already shows the wifi indicator,
 * so this component is only rendered on web.
 */
export function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const goOnline  = () => setOffline(false);
    const goOffline = () => setOffline(true);
    window.addEventListener('online',  goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online',  goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      className="fixed top-0 inset-x-0 z-[9999] flex items-center justify-center gap-3 py-3 px-4 text-sm font-medium bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg"
      style={{
        animation: 'slideDown 0.3s ease-out',
      }}
    >
      <WifiOff className="h-5 w-5 flex-shrink-0" />
      <div className="flex-1">
        <div className="font-semibold">You're Offline</div>
        <div className="text-xs opacity-90">Showing cached data. Connect to internet for latest updates.</div>
      </div>
      <style>{`
        @keyframes slideDown {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
