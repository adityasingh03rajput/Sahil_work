/**
 * DisplayContext — controls font size and element density for the native APK.
 * Persisted to localStorage. Applied as CSS custom properties on <html>.
 *
 * Scale levels:
 *   compact  → root 11px, tight padding
 *   medium   → root 13px (default, matches WhatsApp density)
 *   large    → root 15px, more breathing room
 */
import { createContext, useContext, useEffect, useState } from 'react';

export type DisplayScale = 'compact' | 'medium' | 'large';

interface DisplayContextType {
  scale: DisplayScale;
  setScale: (s: DisplayScale) => void;
}

const DisplayContext = createContext<DisplayContextType>({
  scale: 'medium',
  setScale: () => {},
});

const STORAGE_KEY = 'nativeDisplayScale';

const ROOT_FONT: Record<DisplayScale, string> = {
  compact: '11px',
  medium:  '13px',
  large:   '15px',
};

// Padding multiplier applied via CSS var --dp (density padding)
const DENSITY_PAD: Record<DisplayScale, string> = {
  compact: '0.6',
  medium:  '0.8',
  large:   '1.0',
};

function applyScale(scale: DisplayScale) {
  const html = document.documentElement;
  // Only apply on native — class is set by main.tsx
  if (!html.classList.contains('native-app')) return;
  html.style.setProperty('--native-font-size', ROOT_FONT[scale]);
  html.style.setProperty('--dp', DENSITY_PAD[scale]);
  // Drive the root font-size
  html.style.fontSize = ROOT_FONT[scale];
}

export function DisplayProvider({ children }: { children: React.ReactNode }) {
  const [scale, setScaleState] = useState<DisplayScale>(() => {
    try { return (localStorage.getItem(STORAGE_KEY) as DisplayScale) || 'medium'; }
    catch { return 'medium'; }
  });

  const setScale = (s: DisplayScale) => {
    setScaleState(s);
    try { localStorage.setItem(STORAGE_KEY, s); } catch {}
    applyScale(s);
  };

  useEffect(() => { applyScale(scale); }, [scale]);

  return (
    <DisplayContext.Provider value={{ scale, setScale }}>
      {children}
    </DisplayContext.Provider>
  );
}

export function useDisplay() {
  return useContext(DisplayContext);
}
