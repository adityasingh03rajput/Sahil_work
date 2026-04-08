/**
 * MobileFormSheet — bottom-sheet form container for mobile APK.
 * Uses 100% inline styles to ensure correct rendering in Android WebView.
 */

import { ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface MobileFormSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}

export function MobileFormSheet({ open, onClose, title, children }: MobileFormSheetProps) {
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 640;

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex',
      alignItems: isDesktop ? 'center' : 'flex-end', justifyContent: 'center' }}
      role="dialog" aria-modal="true" aria-label={title}>
      {/* Backdrop */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
        onClick={onClose} />

      {/* Sheet */}
      <div style={{
        position: 'relative', width: '100%', maxWidth: 560,
        backgroundColor: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: isDesktop ? 16 : '24px 24px 0 0',
        maxHeight: isDesktop ? '85dvh' : '92dvh',
        margin: isDesktop ? '0 16px' : 0,
        display: 'flex', flexDirection: 'column' as const,
        boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
        paddingBottom: isDesktop ? 0 : 'env(safe-area-inset-bottom, 0px)',
      }}>
        {/* Drag handle — mobile only */}
        {!isDesktop && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--muted-foreground)', opacity: 0.2 }} />
          </div>
        )}

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: isDesktop ? '16px 20px' : '8px 20px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--card-foreground)',
            fontFamily: 'system-ui,-apple-system,sans-serif' }}>{title}</h2>
          <button type="button" onClick={onClose}
            style={{ width: 36, height: 36, borderRadius: 12, border: 'none', cursor: 'pointer',
              background: 'var(--muted)', color: 'var(--muted-foreground)',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            aria-label="Close">
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', overscrollBehavior: 'contain', padding: '16px 20px' }}>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}

interface MobileFormSectionProps {
  label: string;
  children: ReactNode;
  className?: string;
}

export function MobileFormSection({ label, children }: MobileFormSectionProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em',
          color: 'var(--muted-foreground)', fontFamily: 'system-ui,sans-serif', whiteSpace: 'nowrap' }}>
          {label}
        </span>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>
      {children}
    </div>
  );
}

interface MobileFormActionsProps {
  children: ReactNode;
  className?: string;
}

export function MobileFormActions({ children }: MobileFormActionsProps) {
  return (
    <div style={{ flexShrink: 0, display: 'flex', flexWrap: 'wrap', alignItems: 'center',
      justifyContent: 'flex-end', gap: 10, padding: '12px 20px',
      borderTop: '1px solid var(--border)', background: 'var(--card)' }}>
      {children}
    </div>
  );
}
