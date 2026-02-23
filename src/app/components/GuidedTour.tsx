import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Button } from './ui/button';

type TourStep = {
  route?: string;
  selector: string;
  title: string;
  description: string;
  ctaLabel?: string;
  ctaPath?: string;
};

type Rect = { left: number; top: number; width: number; height: number };

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function GuidedTour({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const isMobile = typeof window !== 'undefined' ? window.matchMedia('(max-width: 768px)').matches : false;

  const steps = useMemo<TourStep[]>(
    () => [
      {
        route: '/dashboard',
        selector: '[data-tour-id="mobile-menu-trigger"]',
        title: 'Menu',
        description: 'Tap here to open the menu on mobile.',
      },
      {
        route: '/dashboard',
        selector: '[data-tour-id="nav-dashboard"]',
        title: 'Dashboard',
        description: 'Quick view of totals, recent documents, and top items.',
        ctaLabel: 'Open',
        ctaPath: '/dashboard',
      },
      {
        route: '/dashboard',
        selector: '[data-tour-id="cta-create-document"]',
        title: 'Create Document',
        description: 'Start here to create invoices/quotations/orders/challans and purchase invoices.',
        ctaLabel: 'Open',
        ctaPath: '/documents/create',
      },
      {
        route: '/dashboard',
        selector: '[data-tour-id="cta-add-customer"]',
        title: 'Add Customer',
        description: 'Save customers once, reuse in documents instantly.',
        ctaLabel: 'Open',
        ctaPath: '/customers',
      },
      {
        route: '/dashboard',
        selector: '[data-tour-id="cta-add-item"]',
        title: 'Add Item',
        description: 'Create items/services with taxes, unit, rates and HSN/SAC.',
        ctaLabel: 'Open',
        ctaPath: '/items',
      },
      {
        route: '/documents',
        selector: '[data-tour-id="nav-documents"]',
        title: 'Documents',
        description: 'Create, edit, duplicate, convert, download PDFs and manage payments.',
        ctaLabel: 'Open',
        ctaPath: '/documents',
      },
      {
        route: '/documents',
        selector: '[data-tour-id="cta-documents-create"]',
        title: 'Create Document Button',
        description: 'Use this to create a new document anytime.',
        ctaLabel: 'Create',
        ctaPath: '/documents/create',
      },
      {
        route: '/customers',
        selector: '[data-tour-id="nav-parties"]',
        title: 'Parties',
        description: 'Manage customers and suppliers. Reuse them in documents.',
        ctaLabel: 'Open',
        ctaPath: '/customers',
      },
      {
        route: '/customers',
        selector: '[data-tour-id="cta-add-customer"]',
        title: 'Add Customer',
        description: 'Add customers from here. You can switch to suppliers too.',
      },
      {
        route: '/suppliers',
        selector: '[data-tour-id="cta-add-supplier"]',
        title: 'Add Supplier',
        description: 'Add suppliers with bank and UPI details for purchase invoices.',
      },
      {
        route: '/items',
        selector: '[data-tour-id="nav-items"]',
        title: 'Items',
        description: 'Create item/service list with taxes, unit, rates and HSN/SAC.',
        ctaLabel: 'Open',
        ctaPath: '/items',
      },
      {
        route: '/items',
        selector: '[data-tour-id="cta-add-item"]',
        title: 'Add Item',
        description: 'Add items/services that will appear in documents.',
      },
      {
        route: '/analytics',
        selector: '[data-tour-id="nav-analytics"]',
        title: 'Analytics',
        description: 'Track sales, invoices and business performance.',
        ctaLabel: 'Open',
        ctaPath: '/analytics',
      },
      {
        route: '/reports/gst',
        selector: '[data-tour-id="nav-gst"]',
        title: 'GST Reports',
        description: 'Generate and review GST reports.',
        ctaLabel: 'Open',
        ctaPath: '/reports/gst',
      },
      {
        route: '/subscription',
        selector: '[data-tour-id="nav-subscription"]',
        title: 'Subscription',
        description: 'Manage plan, renewals and access validity.',
        ctaLabel: 'Open',
        ctaPath: '/subscription',
      },
      {
        route: '/documents/create',
        selector: '[data-tour-id="cta-save-document"]',
        title: 'Save Document',
        description: 'Save the document once you fill all details.',
      },
      {
        route: '/documents',
        selector: '[data-tour-id="doc-action-menu"]',
        title: 'Document Actions',
        description: 'Open actions like payment and PDF download for a document.',
      },
      {
        route: '/documents',
        selector: '[data-tour-id="doc-action-download-pdf"]',
        title: 'Download PDF',
        description: 'Download PDF using templates and share with your customer.',
      },
      {
        route: '/documents',
        selector: '[data-tour-id="doc-action-add-payment"]',
        title: 'Add Payment',
        description: 'Record payment and update the payment status.',
      },
      {
        route: '/profiles',
        selector: '[data-tour-id="nav-profiles"]',
        title: 'Profiles',
        description: 'Switch or edit business profiles and saved bank/UPI details.',
        ctaLabel: 'Open',
        ctaPath: '/profiles',
      },
    ],
    [],
  );

  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [targetExists, setTargetExists] = useState(true);

  const total = steps.length;
  const step = steps[Math.min(stepIndex, total - 1)];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === total - 1;

  const close = () => onOpenChange(false);

  const measure = () => {
    if (!open) return;
    const el = document.querySelector(step.selector) as HTMLElement | null;
    if (!el) {
      setRect(null);
      setTargetExists(false);

      if (step.route && location.pathname !== step.route) {
        navigate(step.route);
      }
      return;
    }

    setTargetExists(true);
    try {
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    } catch {
      // ignore
    }

    const r = el.getBoundingClientRect();
    const padding = 8;
    const next: Rect = {
      left: clamp(r.left - padding, 8, window.innerWidth - 8),
      top: clamp(r.top - padding, 8, window.innerHeight - 8),
      width: clamp(r.width + padding * 2, 24, window.innerWidth - 16),
      height: clamp(r.height + padding * 2, 24, window.innerHeight - 16),
    };

    setRect(next);
  };

  useLayoutEffect(() => {
    if (!open) return;
    measure();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, stepIndex, location.pathname]);

  useEffect(() => {
    if (!open) return;

    const onResize = () => measure();
    const onScroll = () => measure();

    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onScroll, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, stepIndex]);

  useEffect(() => {
    if (open) return;
    setStepIndex(0);
    setRect(null);
    setTargetExists(true);
  }, [open]);

  if (!open) return null;

  const tooltipMaxWidth = 360;
  const tooltipLeft = rect
    ? clamp(rect.left + rect.width + 12, 12, window.innerWidth - tooltipMaxWidth - 12)
    : 12;
  const tooltipTop = rect ? clamp(rect.top, 12, window.innerHeight - 220) : 12;

  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/50" />

      {rect && (
        <div
          className="absolute rounded-xl ring-2 ring-blue-400/80"
          style={{
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
            background: 'rgba(255,255,255,0.02)',
          }}
        />
      )}

      <div
        className={
          isMobile
            ? 'fixed left-3 right-3 bottom-3 w-auto rounded-2xl border bg-white p-4 shadow-2xl pb-[calc(1rem+env(safe-area-inset-bottom))]'
            : 'absolute w-[min(360px,calc(100vw-24px))] rounded-xl border bg-white p-4 shadow-xl'
        }
        style={isMobile ? undefined : { left: tooltipLeft, top: tooltipTop, maxWidth: tooltipMaxWidth }}
      >
        <div className={isMobile ? 'text-[11px] text-slate-500' : 'text-xs text-slate-500'}>
          Step {stepIndex + 1} / {total}
        </div>
        <div className={isMobile ? 'mt-1 text-[15px] font-semibold text-slate-900' : 'mt-1 text-base font-semibold text-slate-900'}>
          {step.title}
        </div>
        <div className={isMobile ? 'mt-1 text-[13px] leading-5 text-slate-600' : 'mt-1 text-sm text-slate-600'}>
          {step.description}
        </div>

        {!targetExists && (
          <div className="mt-2 text-xs text-amber-700">Target not visible on this screen. Use Next.</div>
        )}

        <div className={isMobile ? 'mt-4 flex flex-col gap-2' : 'mt-4 flex items-center justify-between gap-2'}>
          <Button
            type="button"
            variant="outline"
            onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
            disabled={isFirst}
            className={isMobile ? 'h-10 w-full' : undefined}
          >
            Back
          </Button>

          <div className={isMobile ? 'flex w-full flex-col gap-2' : 'flex gap-2'}>
            {step.ctaPath && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  close();
                  navigate(step.ctaPath!);
                }}
                className={isMobile ? 'h-10 w-full' : undefined}
              >
                {step.ctaLabel || 'Open'}
              </Button>
            )}
            <Button
              type="button"
              onClick={() => {
                if (isLast) close();
                else setStepIndex((i) => Math.min(total - 1, i + 1));
              }}
              className={isMobile ? 'h-10 w-full' : undefined}
            >
              {isLast ? 'Finish' : 'Next'}
            </Button>
          </div>
        </div>

        <div className="mt-3 text-right">
          <button type="button" onClick={close} className="text-xs text-slate-500 hover:text-slate-700">
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}
