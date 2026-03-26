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
  const [deviceId] = useState(() => {
    let id = localStorage.getItem('deviceId');
    if (!id) {
      id = 'web-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('deviceId', id);
    }
    return id;
  });
  // loading is false immediately — we read from localStorage synchronously above
  const [loading, setLoading] = useState(false);

  const apiUrl = API_URL;

  // Global 402 interceptor — patch window.fetch once per session
  useEffect(() => {
    const original = window.fetch.bind(window);
    window.fetch = async (...args) => {
      const res = await original(...args);
      if (res.status === 402) {
        setSubscriptionExpired(true);
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
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    localStorage.removeItem('currentProfile');
    localStorage.removeItem('deviceId'); // clear device binding so next login on any device works
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider value={{ user, accessToken, deviceId, loading, subscriptionExpired, setSubscriptionExpired, signIn, signInAsEmployee, signUp, signOut, isEmployee }}>
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
