import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Button } from './ui/button';
import { useTour } from '../contexts/TourContext';
import { ShieldCheck, Info } from 'lucide-react';

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
  const { currentStepIndex, setStepIndex, isDemoMode, endTour } = useTour();

  const isMobile = typeof window !== 'undefined' ? window.matchMedia('(max-width: 768px)').matches : false;

  const steps = useMemo<TourStep[]>(
    () => [
      {
        route: '/dashboard',
        selector: '[data-tour-id="nav-dashboard"]',
        title: 'Welcome to BillVyapar vv1.0.1',
        description: 'Experience your business command center. We have enabled Demo Mode: explore safely with dummy data while your real records remain untouched.',
      },
      {
        route: '/dashboard',
        selector: '[data-tour-id="dashboard-tools-trigger"]',
        title: 'New: Dashboard Tools',
        description: 'Tucked inside this menu are your Theme settings, Fullscreen mode, and this very Walkthrough. Personalize your workspace in seconds.',
      },
      {
        route: '/documents/create',
        selector: '[data-tour-id="cta-create-document"]',
        title: 'Step 1: Professional Invoicing',
        description: 'Billing is now a breeze. In Demo Mode, we pre-fill data automatically so you can see the beauty of our GST-ready templates.',
        ctaLabel: 'Try Billing',
        ctaPath: '/documents/create',
      },
      {
        route: '/documents/create',
        selector: '.item-table-header',
        title: 'Smart Line Items',
        description: 'Add products with intelligent HSN matching, SGST/CGST/IGST calculations, and item-wise discounts automatically computed.',
      },
      {
        route: '/customers',
        selector: '[data-tour-id="nav-parties"]',
        title: 'Step 2: Unified Party Center',
        description: 'Manage both Customers and Suppliers. Switch tabs to see your entire supply chain and debt status in one view.',
        ctaLabel: 'Manage Parties',
        ctaPath: '/customers',
      },
      {
        route: '/customers',
        selector: '[data-tour-id="party-info-btn"]',
        title: 'New: Party Insight',
        description: 'Click the "i" icon on any card to access the Ledger, Outstanding analysis, and specific GST reports for that party instantly.',
      },
      {
        route: '/customers',
        selector: '[data-tour-id="cta-add-customer"]',
        title: 'Lightning GST Lookup',
        description: 'Simply paste a GSTIN and watch us fetch the Business Name, Address, and PAN details from the official registry.',
      },
      {
        route: '/ledger',
        selector: '[data-tour-id="nav-ledger"]',
        title: 'Step 3: Automated Ledger',
        description: 'Real-time reconciliation. Every invoice and payment is automatically posted here. Export to PDF/Excel for your CA with one click.',
        ctaLabel: 'Audit Ledger',
        ctaPath: '/ledger',
      },
      {
        route: '/dashboard',
        selector: '[data-tour-id="dashboard-outstanding-card"]',
        title: 'Step 4: Smart Outstanding',
        description: 'Never lose track of payments. Outstanding is calculated as (Total Sales - Received Amount). Click here to deep-dive into unpaid bills.',
        ctaLabel: 'Track Debts',
        ctaPath: '/dashboard',
      },
      {
        route: '/reports/gst',
        selector: '[data-tour-id="nav-gst"]',
        title: 'Step 5: Tax Compliance',
        description: 'Generate GSTR-1 and GSTR-3B audit-ready summaries. We handle the complex math so you stay worry-free.',
        ctaLabel: 'View Tax Reports',
        ctaPath: '/reports/gst',
      },
      {
        route: '/analytics',
        selector: '[data-tour-id="nav-analytics"]',
        title: 'Step 6: Business Intelligence',
        description: 'Growth at a glance. Performance charts, Top Customers, and Expense tracking to help you make data-driven decisions.',
        ctaLabel: 'Explore Data',
        ctaPath: '/analytics',
      },
      {
        route: '/bank-accounts',
        selector: '[data-tour-id="nav-bank-accounts"]',
        title: 'Step 7: UPI & QR Payments',
        description: 'Setup your bank and UPI IDs once. We automatically print dynamic QR codes on your invoices for instant collections.',
        ctaLabel: 'Setup Payments',
        ctaPath: '/bank-accounts',
      },
      {
        route: '/dashboard',
        selector: '.p-2:contains("vv1.0.1")',
        title: 'You are all set!',
        description: 'The vv1.0.1 Premium Edition is ready for your business. Restart this tour anytime from the tool menu.',
      },
    ],
    [],
  );

  const [rect, setRect] = useState<Rect | null>(null);
  const [targetExists, setTargetExists] = useState(true);

  const total = steps.length;
  const step = steps[Math.min(currentStepIndex, total - 1)];
  const isFirst = currentStepIndex === 0;
  const isLast = currentStepIndex === total - 1;

  const close = () => {
    endTour();
    onOpenChange(false);
  };

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
  }, [open, currentStepIndex, location.pathname]);

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
  }, [open, currentStepIndex]);

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
        <div className={isMobile ? 'text-[11px] text-slate-500' : 'text-xs text-slate-500 flex items-center justify-between'}>
          <span>Step {currentStepIndex + 1} / {total}</span>
          {isDemoMode && (
             <span className="flex items-center gap-1 text-red-600 font-bold uppercase tracking-wider bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
               <ShieldCheck className="h-3 w-3" />
               Demo Mode
             </span>
          )}
        </div>
        <div className={isMobile ? 'mt-1 text-[15px] font-semibold text-slate-900' : 'mt-1 text-lg font-bold text-slate-900 flex items-center gap-2'}>
          <Info className="h-5 w-5 text-blue-500" />
          {step.title}
        </div>
        <div className={isMobile ? 'mt-1 text-[13px] leading-5 text-slate-600' : 'mt-2 text-[15px] leading-relaxed text-slate-700'}>
          {step.description}
        </div>

        {!targetExists && (
          <div className="mt-3 flex items-center gap-2 text-xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
            <Info className="h-3.5 w-3.5" />
            Target element hidden. Navigating to page...
          </div>
        )}

        <div className={isMobile ? 'mt-4 flex flex-col gap-2' : 'mt-5 flex items-center justify-between gap-2'}>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setStepIndex(Math.max(0, currentStepIndex - 1))}
            disabled={isFirst}
            className={isMobile ? 'h-10 w-full' : 'text-slate-500'}
          >
            Back
          </Button>

          <div className={isMobile ? 'flex w-full flex-col gap-2' : 'flex gap-3'}>
            {step.ctaPath && (
              <Button
                type="button"
                variant="outline"
                className="border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                onClick={() => {
                  navigate(step.ctaPath!);
                }}
              >
                {step.ctaLabel || 'Action'}
              </Button>
            )}
            <Button
              type="button"
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200"
              onClick={() => {
                if (isLast) close();
                else setStepIndex(Math.min(total - 1, currentStepIndex + 1));
              }}
            >
              {isLast ? 'Finish' : 'Next Step'}
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
