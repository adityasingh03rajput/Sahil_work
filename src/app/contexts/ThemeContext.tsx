import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system' | 'warm' | 'ocean' | 'emerald' | 'rosewood';

type ThemeContextValue = {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  resolvedTheme: 'light' | 'dark';
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'theme';

const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const THEME_CLASSES = ['theme-warm', 'theme-ocean', 'theme-emerald', 'theme-rosewood'] as const;

const applyResolvedTheme = (resolvedTheme: 'light' | 'dark', themeClass: (typeof THEME_CLASSES)[number] | null) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.toggle('dark', resolvedTheme === 'dark');
  THEME_CLASSES.forEach((c) => root.classList.remove(c));
  if (themeClass) root.classList.add(themeClass);
};

type LegacyMediaQueryList = MediaQueryList & {
  addListener?: (listener: (this: MediaQueryList, ev: MediaQueryListEvent) => any) => void;
  removeListener?: (listener: (this: MediaQueryList, ev: MediaQueryListEvent) => any) => void;
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return 'light';
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === 'light' || raw === 'dark' || raw === 'system' || raw === 'warm' || raw === 'ocean' || raw === 'emerald' || raw === 'rosewood') return raw;
    return 'warm';
  });

  const resolvedTheme = useMemo(() => {
    if (theme === 'system') return getSystemTheme();
    if (theme === 'warm' || theme === 'ocean' || theme === 'emerald' || theme === 'rosewood') return 'light';
    return theme;
  }, [theme]);

  const themeClass = useMemo<(typeof THEME_CLASSES)[number] | null>(() => {
    if (theme === 'warm') return 'theme-warm';
    if (theme === 'ocean') return 'theme-ocean';
    if (theme === 'emerald') return 'theme-emerald';
    if (theme === 'rosewood') return 'theme-rosewood';
    return null;
  }, [theme]);

  useEffect(() => {
    applyResolvedTheme(resolvedTheme, themeClass);
  }, [resolvedTheme, theme]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!window.matchMedia) return;
    if (theme !== 'system') return;

    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      applyResolvedTheme(getSystemTheme(), null);
    };

    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    }

    const legacy = mql as LegacyMediaQueryList;
    if (typeof legacy.addListener === 'function' && typeof legacy.removeListener === 'function') {
      legacy.addListener(onChange as any);
      return () => legacy.removeListener!(onChange as any);
    }
  }, [theme]);

  const setTheme = (next: ThemeMode) => {
    setThemeState(next);
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, next);
  };

  const value = useMemo<ThemeContextValue>(() => ({ theme, setTheme, resolvedTheme }), [resolvedTheme, theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
