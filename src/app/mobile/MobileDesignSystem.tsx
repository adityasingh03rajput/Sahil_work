/**
 * Mobile Design System — Centralized styles and components for mobile UX
 * Replaces hardcoded inline styles with consistent, theme-aware design tokens
 */
import React, { useMemo } from 'react';
import { useTheme } from '../contexts/ThemeContext';

// ─────────────────────────────────────────────────────────────────────────────
// DESIGN TOKENS - Now theme-aware
// ─────────────────────────────────────────────────────────────────────────────

const getThemeTokens = (theme: string) => {
  // Map theme to CSS variables that are already defined in theme.css
  const themeMap: Record<string, { bg: string; surface: string; text: string; accent: string }> = {
    'light': {
      bg: 'var(--background)',
      surface: 'var(--card)',
      text: 'var(--foreground)',
      accent: 'var(--primary)',
    },
    'dark': {
      bg: 'var(--background)',
      surface: 'var(--card)',
      text: 'var(--foreground)',
      accent: 'var(--primary)',
    },
    'warm': {
      bg: 'var(--background)',
      surface: 'var(--card)',
      text: 'var(--foreground)',
      accent: 'var(--primary)',
    },
    'ocean': {
      bg: 'var(--background)',
      surface: 'var(--card)',
      text: 'var(--foreground)',
      accent: 'var(--primary)',
    },
    'emerald': {
      bg: 'var(--background)',
      surface: 'var(--card)',
      text: 'var(--foreground)',
      accent: 'var(--primary)',
    },
    'rosewood': {
      bg: 'var(--background)',
      surface: 'var(--card)',
      text: 'var(--foreground)',
      accent: 'var(--primary)',
    },
  };

  return themeMap[theme] || themeMap['dark'];
};

export const MOBILE_TOKENS = {
  // Colors - using CSS variables for theme responsiveness
  colors: {
    bg: 'var(--background)',
    surface: 'var(--card)',
    surfaceAlt: 'var(--muted)',
    border: 'var(--border)',
    borderLight: 'var(--border)',
    text: 'var(--foreground)',
    textMuted: 'var(--muted-foreground)',
    textSecondary: 'var(--muted-foreground)',
    accent: 'var(--primary)',
    accentAlt: 'var(--secondary)',
    success: '#10b981',
    warning: '#f59e0b',
    error: 'var(--destructive)',
    overlay: 'rgba(0,0,0,0.6)',
  },
  // Spacing
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
  },
  // Border radius
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 999,
  },
  // Typography
  typography: {
    h1: { fontSize: 28, fontWeight: 900, lineHeight: 1.1 },
    h2: { fontSize: 24, fontWeight: 800, lineHeight: 1.2 },
    h3: { fontSize: 20, fontWeight: 700, lineHeight: 1.3 },
    body: { fontSize: 15, fontWeight: 400, lineHeight: 1.5 },
    bodySmall: { fontSize: 13, fontWeight: 400, lineHeight: 1.5 },
    label: { fontSize: 11, fontWeight: 700, lineHeight: 1.2 },
    caption: { fontSize: 10, fontWeight: 600, lineHeight: 1.2 },
  },
  // Touch targets (minimum 44px)
  touchTarget: 44,
  // Safe area
  safeAreaBottom: 'env(safe-area-inset-bottom, 0px)',
};

// ─────────────────────────────────────────────────────────────────────────────
// REUSABLE STYLES
// ─────────────────────────────────────────────────────────────────────────────

export const MOBILE_STYLES = {
  // Containers
  page: {
    padding: `${MOBILE_TOKENS.spacing.md}px ${MOBILE_TOKENS.spacing.md}px calc(${MOBILE_TOKENS.safeAreaBottom} + 100px)`,
    fontFamily: 'system-ui, -apple-system, sans-serif',
    background: MOBILE_TOKENS.colors.bg,
    color: MOBILE_TOKENS.colors.text,
    minHeight: '100vh',
  } as React.CSSProperties,

  card: {
    background: MOBILE_TOKENS.colors.surface,
    borderRadius: MOBILE_TOKENS.radius.lg,
    border: `1px solid ${MOBILE_TOKENS.colors.border}`,
    padding: MOBILE_TOKENS.spacing.md,
    marginBottom: MOBILE_TOKENS.spacing.md,
  } as React.CSSProperties,

  // Buttons
  button: (variant: 'primary' | 'secondary' | 'ghost' = 'primary') => {
    const variants = {
      primary: {
        background: MOBILE_TOKENS.colors.accent,
        color: 'var(--primary-foreground)',
        border: 'none',
      },
      secondary: {
        background: MOBILE_TOKENS.colors.surfaceAlt,
        color: MOBILE_TOKENS.colors.text,
        border: `1px solid ${MOBILE_TOKENS.colors.border}`,
      },
      ghost: {
        background: 'transparent',
        color: MOBILE_TOKENS.colors.text,
        border: 'none',
      },
    };
    return {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: MOBILE_TOKENS.spacing.sm,
      padding: `${MOBILE_TOKENS.spacing.md}px 0`,
      borderRadius: MOBILE_TOKENS.radius.md,
      cursor: 'pointer',
      fontWeight: 700,
      fontSize: 14,
      fontFamily: 'system-ui, sans-serif',
      transition: 'all 0.2s ease',
      minHeight: MOBILE_TOKENS.touchTarget,
      ...variants[variant],
    } as React.CSSProperties;
  },

  // Input
  input: {
    width: '100%',
    padding: `${MOBILE_TOKENS.spacing.sm}px ${MOBILE_TOKENS.spacing.md}px`,
    borderRadius: MOBILE_TOKENS.radius.md,
    border: `1px solid ${MOBILE_TOKENS.colors.border}`,
    background: 'var(--input-background)',
    color: MOBILE_TOKENS.colors.text,
    fontSize: 15,
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'system-ui, sans-serif',
  } as React.CSSProperties,

  label: {
    display: 'block',
    fontSize: 11,
    fontWeight: 700,
    color: MOBILE_TOKENS.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    marginBottom: MOBILE_TOKENS.spacing.sm,
    fontFamily: 'system-ui, sans-serif',
  } as React.CSSProperties,

  // List items
  listItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `${MOBILE_TOKENS.spacing.md}px 0`,
    borderBottom: `1px solid ${MOBILE_TOKENS.colors.border}`,
  } as React.CSSProperties,

  // Skeleton loader
  skeleton: {
    height: 80,
    borderRadius: MOBILE_TOKENS.radius.lg,
    background: 'var(--muted)',
    marginBottom: MOBILE_TOKENS.spacing.md,
    animation: 'mpulse 1.4s ease-in-out infinite',
  } as React.CSSProperties,

  // Sheet (bottom drawer)
  sheet: {
    position: 'fixed' as const,
    inset: 0,
    zIndex: 60,
    display: 'flex',
    alignItems: 'flex-end',
  } as React.CSSProperties,

  sheetOverlay: {
    position: 'absolute' as const,
    inset: 0,
    background: MOBILE_TOKENS.colors.overlay,
  } as React.CSSProperties,

  sheetContent: {
    position: 'relative' as const,
    width: '100%',
    background: MOBILE_TOKENS.colors.surface,
    borderRadius: `${MOBILE_TOKENS.radius.xl}px ${MOBILE_TOKENS.radius.xl}px 0 0`,
    maxHeight: '90dvh',
    display: 'flex',
    flexDirection: 'column' as const,
    boxShadow: '0 -12px 40px rgba(0,0,0,0.2)',
    fontFamily: 'system-ui, sans-serif',
  } as React.CSSProperties,

  sheetHandle: {
    display: 'flex',
    justifyContent: 'center',
    padding: `${MOBILE_TOKENS.spacing.sm}px 0 ${MOBILE_TOKENS.spacing.xs}px`,
  } as React.CSSProperties,

  sheetHandleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    background: MOBILE_TOKENS.colors.borderLight,
  } as React.CSSProperties,

  sheetHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `${MOBILE_TOKENS.spacing.sm}px ${MOBILE_TOKENS.spacing.lg}px ${MOBILE_TOKENS.spacing.md}px`,
    borderBottom: `1px solid ${MOBILE_TOKENS.colors.border}`,
  } as React.CSSProperties,

  sheetBody: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: `${MOBILE_TOKENS.spacing.md}px ${MOBILE_TOKENS.spacing.lg}px`,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: MOBILE_TOKENS.spacing.md,
  } as React.CSSProperties,
};

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// REUSABLE COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

export function MobileSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div style={{ padding: `${MOBILE_TOKENS.spacing.md}px ${MOBILE_TOKENS.spacing.md}px calc(${MOBILE_TOKENS.safeAreaBottom} + 100px)` }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={MOBILE_STYLES.skeleton} />
      ))}
      <style>{`@keyframes mpulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </div>
  );
}

export function MobileButton({
  children,
  variant = 'primary',
  onClick,
  disabled = false,
  style,
}: {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  onClick?: () => void;
  disabled?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...MOBILE_STYLES.button(variant),
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export function MobileCard({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return <div style={{ ...MOBILE_STYLES.card, ...style }}>{children}</div>;
}

export function MobileInput({
  placeholder,
  value,
  onChange,
  type = 'text',
  style,
}: {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  style?: React.CSSProperties;
}) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ ...MOBILE_STYLES.input, ...style }}
    />
  );
}

export function MobileLabel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <label style={{ ...MOBILE_STYLES.label, ...style }}>{children}</label>;
}

// ─────────────────────────────────────────────────────────────────────────────
// HOOK FOR THEME-AWARE TOKENS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook to get theme-aware mobile tokens
 * Returns tokens that automatically update when theme changes
 */
export function useMobileTokens() {
  const { theme } = useTheme();
  
  return useMemo(() => {
    // Return the same MOBILE_TOKENS object - it uses CSS variables
    // which automatically update when the theme class changes on document.documentElement
    return MOBILE_TOKENS;
  }, [theme]);
}
