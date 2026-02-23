import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_URL } from '../config/api';

interface User {
  id: string;
  email: string;
  name?: string;
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  deviceId: string;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string, phone: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [deviceId] = useState(() => {
    let id = localStorage.getItem('deviceId');
    if (!id) {
      id = 'web-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('deviceId', id);
    }
    return id;
  });
  const [loading, setLoading] = useState(true);

  const apiUrl = API_URL;

  useEffect(() => {
    // Check for existing session
    const storedToken = localStorage.getItem('accessToken');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken && storedUser) {
      setAccessToken(storedToken);
      setUser(JSON.parse(storedUser));
      
      // Verify session
      fetch(`${apiUrl}/auth/verify-session`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${storedToken}`,
          'X-Device-ID': deviceId,
        },
      })
        .then(res => res.json())
        .then(data => {
          if (data.error) {
            // Session invalid, clear storage
            localStorage.removeItem('accessToken');
            localStorage.removeItem('user');
            setAccessToken(null);
            setUser(null);
          }
        })
        .catch(() => {
          // On error, keep local session for offline mode
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [deviceId]);

  const signIn = async (email: string, password: string) => {
    const response = await fetch(`${apiUrl}/auth/signin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-ID': deviceId,
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    
    if (data.error) {
      const err: any = new Error(data.error);
      err.code = data.code;
      throw err;
    }

    const userData = {
      id: data.user.id,
      email: data.user.email,
      name: data.user.user_metadata?.name,
    };

    setUser(userData);
    setAccessToken(data.session.access_token);
    localStorage.setItem('accessToken', data.session.access_token);
    localStorage.setItem('user', JSON.stringify(userData));
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

  const signOut = () => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      fetch(`${apiUrl}/auth/signout`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Device-ID': deviceId,
        },
      }).catch(() => {
        // ignore
      });
    }
    setUser(null);
    setAccessToken(null);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    localStorage.removeItem('currentProfile');
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider value={{ user, accessToken, deviceId, loading, signIn, signUp, signOut }}>
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
