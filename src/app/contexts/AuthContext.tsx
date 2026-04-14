import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_URL } from '../config/api';
import { clearApiCache } from '../hooks/useApiCache';

interface User {
  id: string;
  email: string;
  name?: string;
  // Employee-specific fields (only set when logged in as employee)
  userType?: 'owner' | 'employee';
  role?: 'manager' | 'salesperson' | 'accountant' | 'viewer';
  ownerUserId?: string;
  profileId?: string;
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  deviceId: string;
  loading: boolean;
  subscriptionExpired: boolean;
  isEmployee: boolean;
  sessionKey: number; 
  profiles: any[];
  reloadProfiles: () => Promise<void>;
  setSubscriptionExpired: (v: boolean) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signInAsEmployee: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string, phone: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });
  const [accessToken, setAccessToken] = useState<string | null>(() => {
    return localStorage.getItem('accessToken');
  });
  const [subscriptionExpired, setSubscriptionExpired] = useState(false);
  const isEmployee = user?.userType === 'employee';
  const [sessionKey, setSessionKey] = useState(0);
  const [deviceId] = useState(() => {
    let id = localStorage.getItem('deviceId');
    if (!id) {
      id = 'web-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('deviceId', id);
    }
    return id;
  });
  // loading indicates whether we are still resolving server-backed session state (like profiles list)
  const [loading, setLoading] = useState(() => {
    // If user is already signed in (accessToken exists) we should treat the app as loading
    // until profiles are fetched, otherwise route guards may misfire on hard refresh.
    try {
      return !!localStorage.getItem('accessToken');
    } catch {
      return false;
    }
  });
  const [profiles, setProfiles] = useState<any[]>([]);
  const apiUrl = API_URL;

  const reloadProfiles = async () => {
    if (!accessToken || isEmployee) return;
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/profiles`, {
        headers: { 'Authorization': `Bearer ${accessToken}`, 'X-Device-ID': deviceId }
      });
      const data = await res.json();
      if (Array.isArray(data)) setProfiles(data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (accessToken && !isEmployee) {
      reloadProfiles();
      return;
    }
    setProfiles([]);
    setLoading(false);
  }, [accessToken, isEmployee]);

  // Global fetch interceptor — handles 402 subscription expiry + profile ID remapping
  useEffect(() => {
    const original = window.fetch.bind(window);
    
    // Resilient fetch with automatic retries for transient failures
    const fetchWithRetry = async (input: RequestInfo | URL, init?: RequestInit, retries = 2): Promise<Response> => {
      try {
        const res = await original(input, init);
        // Retry on server-side errors (cold starts, load balancer drops, etc)
        if (res.status >= 500 && retries > 0) {
          const delay = (3 - retries) * 1500;
          console.warn(`[API] Server error ${res.status}, retrying in ${delay}ms...`);
          await new Promise(r => setTimeout(r, delay));
          return fetchWithRetry(input, init, retries - 1);
        }
        return res;
      } catch (err: any) {
        // Retry on network-level failures (lost signal, timeout)
        const isNetworkError = err.name === 'TypeError' || err.name === 'NetworkError' || err.message?.includes('network');
        if (isNetworkError && retries > 0) {
          const delay = (3 - retries) * 1500;
          console.warn(`[API] Network failure, retrying in ${delay}ms...`);
          await new Promise(r => setTimeout(r, delay));
          return fetchWithRetry(input, init, retries - 1);
        }
        throw err;
      }
    };

    window.fetch = async (...args) => {
      // Cache-busting for API GET requests
      if (typeof args[0] === 'string' && args[0].startsWith(API_URL)) {
        const method = (args[1]?.method || 'GET').toUpperCase();
        if (method === 'GET') {
          try {
            const urlObj = new URL(args[0]);
            urlObj.searchParams.set('_t', Date.now().toString());
            args[0] = urlObj.toString();
            
            args[1] = args[1] || {};
            const oldHeaders = args[1].headers || {};
            if (oldHeaders instanceof Headers) {
              oldHeaders.set('Cache-Control', 'no-cache, no-store, must-revalidate');
              oldHeaders.set('Pragma', 'no-cache');
              oldHeaders.set('Expires', '0');
            } else {
              args[1].headers = {
                ...oldHeaders,
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
              };
            }
          } catch (e) { /* ignore */ }
        }
      }

      let requestProfileId: string | null = null;
      try {
        if (args[1]?.headers) {
          if (args[1].headers instanceof Headers) {
            requestProfileId = args[1].headers.get('X-Profile-ID');
          } else {
            requestProfileId = (args[1].headers as any)['X-Profile-ID'];
          }
        }
      } catch (e) { /* ignore */ }

      // Use the retry-enabled fetcher
      const res = await fetchWithRetry(...args);

      if (requestProfileId) {
         try {
           const raw = localStorage.getItem('currentProfile');
           const currentProfileId = raw ? JSON.parse(raw)?.id : null;
           if (currentProfileId && requestProfileId !== currentProfileId) {
             return new Promise(() => {});
           }
         } catch (e) { /* ignore */ }
      }

      const remapped = res.headers.get('X-Profile-ID-Remapped');
      if (remapped) {
        try {
          const raw = localStorage.getItem('currentProfile');
          const current = raw ? JSON.parse(raw) : {};
          if (current?.id !== remapped) {
            localStorage.setItem('currentProfile', JSON.stringify({ ...current, id: remapped }));
          }
        } catch { /* ignore */ }
      }

      if (res.status === 402) {
        setSubscriptionExpired(true);
        return res.clone();
      }
      return res;
    };
    return () => { window.fetch = original; };
  }, []);

  useEffect(() => {
    const storedToken = localStorage.getItem('accessToken');
    if (!storedToken) return;

    // Verify session in background — 10s timeout, won't block UI
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10000);
    fetch(`${apiUrl}/auth/verify-session`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${storedToken}`, 'X-Device-ID': deviceId },
      signal: ctrl.signal,
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('user');
          setAccessToken(null);
          setUser(null);
        }
      })
      .catch(() => { /* network error — keep local session */ })
      .finally(() => clearTimeout(t));
  }, [deviceId]);

  const signIn = async (email: string, password: string) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 30000); // 30s for cold-start
    let response: Response;
    try {
      response = await fetch(`${apiUrl}/auth/signin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-ID': deviceId,
        },
        body: JSON.stringify({ email, password }),
        signal: ctrl.signal,
      });
    } finally {
      clearTimeout(t);
    }

    const data = await response.json();
    
    if (data.error) {
      const err: any = new Error(data.error);
      err.code = data.code;
      throw err;
    }

    const userData: User = {
      id: data.user.id,
      email: data.user.email,
      name: data.user.user_metadata?.name,
      userType: 'owner',
    };
    setUser(userData);
    setAccessToken(data.session.access_token);
    setSubscriptionExpired(false);
    localStorage.setItem('accessToken', data.session.access_token);
    localStorage.setItem('user', JSON.stringify(userData));
    // Clear currentProfile — AppLayout will resolve the correct one for this user
    // This prevents user A's profile from flashing when user B logs in
    localStorage.removeItem('currentProfile');
    await clearApiCache();
    // Increment sessionKey to force-remount all pages (wipes all React state)
    setSessionKey(k => k + 1);
    await reloadProfiles();
    // Signal all pages to clear their local state (prevents stale data flash)
    window.dispatchEvent(new CustomEvent('appSignIn', { detail: { userId: userData.id } }));

    // Prefetch the dashboard chunk in the background so it's ready on first navigation
    import('../pages/DashboardPageWrapper').catch(() => {});
  };

  const signUp = async (email: string, password: string, name: string, phone: string) => {
    const response = await fetch(`${apiUrl}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, name, phone }),
    });

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }

    // After signup, sign in automatically
    await signIn(email, password);
  };

  const signInAsEmployee = async (email: string, password: string) => {
    const response = await fetch(`${apiUrl}/employees/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error);

    const userData: User = {
      id: data.user.id,
      email: data.user.email,
      name: data.user.name,
      userType: 'employee',
      role: data.user.role,
      ownerUserId: data.user.ownerUserId,
      profileId: data.user.profileId,
    };
    setUser(userData);
    setAccessToken(data.session.access_token);
    setSubscriptionExpired(false);
    localStorage.setItem('accessToken', data.session.access_token);
    localStorage.setItem('user', JSON.stringify(userData));
    // Auto-set the profile so employee lands on dashboard directly
    localStorage.setItem('currentProfile', JSON.stringify({ id: data.user.profileId }));
  };

  const signOut = async () => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      try {
        await fetch(`${apiUrl}/auth/signout`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Device-ID': deviceId,
          },
        });
      } catch {
        // ignore network errors — session will expire naturally
      }
    }
    setUser(null);
    setAccessToken(null);
    clearApiCache();
    const keysToRemove = ['accessToken', 'user', 'currentProfile', 'deviceId'];
    keysToRemove.forEach(k => localStorage.removeItem(k));
    
    // Specifically keep any keys prefixed with 'bv_filter_' or 'bv_pref_'
    // clearApiCache already handles business data cleanup.
    
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider value={{ user, accessToken, deviceId, loading, subscriptionExpired, setSubscriptionExpired, signIn, signInAsEmployee, signUp, signOut, isEmployee, sessionKey, profiles, reloadProfiles }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
