/**
 * MobileFormSheet — a bottom-sheet style form container for mobile.
 *
 * On mobile (isNative / small screen): slides up from bottom, full-width,
 * rounded top corners, drag-handle indicator, scrollable body.
 *
 * On desktop: renders as a normal centered Dialog.
 *
 * Usage:
 *   <MobileFormSheet open={open} onClose={() => setOpen(false)} title="Add Item">
 *     <form>...</form>
 *   </MobileFormSheet>
 */

import { ReactNode, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from './ui/utils';

interface MobileFormSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Extra class on the sheet panel */
  className?: string;
}

export function MobileFormSheet({ open, onClose, title, children, className }: MobileFormSheetProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Lock body scroll while open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      aria-modal="true"
      role="dialog"
      aria-label={title}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Sheet panel */}
      <div
        className={cn(
          // Mobile: full-width bottom sheet
          'relative w-full bg-background',
          'rounded-t-2xl sm:rounded-xl',
          // Desktop: centered modal
          'sm:max-w-lg sm:mx-4',
          // Height: on mobile fill up to 92dvh, scroll inside
          'max-h-[92dvh] sm:max-h-[88dvh]',
          'flex flex-col',
          // Slide-up animation
          'animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200',
          className,
        )}
      >
        {/* Drag handle (mobile only) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}

/**
 * MobileFormSection — a labeled section divider inside a MobileFormSheet.
 * Groups related fields visually.
 */
interface MobileFormSectionProps {
  label: string;
  children: ReactNode;
  className?: string;
}

export function MobileFormSection({ label, children, className }: MobileFormSectionProps) {
  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
        <div className="flex-1 h-px bg-border" />
      </div>
      {children}
    </div>
  );
}

/**
 * MobileFormActions — sticky bottom action bar inside a sheet.
 */
interface MobileFormActionsProps {
  children: ReactNode;
  className?: string;
}

export function MobileFormActions({ children, className }: MobileFormActionsProps) {
  return (
    <div className={cn(
      'shrink-0 flex flex-wrap items-center justify-end gap-2',
      'px-4 py-3 border-t border-border bg-background',
    )}>
      {children}
    </div>
  );
}
