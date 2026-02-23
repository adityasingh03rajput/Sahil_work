import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';

type WalkthroughStep = {
  title: string;
  description: string;
  ctaLabel?: string;
  ctaPath?: string;
};

export function WalkthroughDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const steps = useMemo<WalkthroughStep[]>(
    () => [
      {
        title: 'Welcome to Hukum',
        description: 'Let’s set up your business and create your first document in a few quick steps.',
      },
      {
        title: 'Create / Select Business Profile',
        description: 'Your profile stores your company details, GSTIN, and bank/UPI details for PDFs.',
        ctaLabel: 'Open Profiles',
        ctaPath: '/profiles',
      },
      {
        title: 'Add Parties (Customers / Suppliers)',
        description: 'Save customer and supplier details once, then reuse them in documents.',
        ctaLabel: 'Open Parties',
        ctaPath: '/customers',
      },
      {
        title: 'Add Items',
        description: 'Create your item/service list with HSN/SAC, rates, taxes, and units.',
        ctaLabel: 'Open Items',
        ctaPath: '/items',
      },
      {
        title: 'Create a Document',
        description: 'Create invoices, quotations, orders, challans, and purchase invoices.',
        ctaLabel: 'Create Document',
        ctaPath: '/documents/create',
      },
      {
        title: 'Download PDF & Track Payments',
        description: 'Download PDFs, duplicate, convert documents, and record payments.',
        ctaLabel: 'Open Documents',
        ctaPath: '/documents',
      },
      {
        title: 'Analytics & Reports',
        description: 'Check analytics and GST reports to understand your business performance.',
        ctaLabel: 'Open Analytics',
        ctaPath: '/analytics',
      },
    ],
    [],
  );

  const [stepIndex, setStepIndex] = useState(0);

  const total = steps.length;
  const step = steps[Math.min(stepIndex, total - 1)];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === total - 1;

  const close = () => onOpenChange(false);

  const goCta = () => {
    if (!step.ctaPath) return;
    close();
    navigate(step.ctaPath);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setStepIndex(0);
      }}
    >
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{step.title}</DialogTitle>
          <DialogDescription>{step.description}</DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            Step {stepIndex + 1} / {total}
          </div>
          <div className="h-1.5 flex-1 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full bg-slate-900 transition-[width] duration-200"
              style={{ width: `${((stepIndex + 1) / total) * 100}%` }}
            />
          </div>
        </div>

        <DialogFooter>
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
              disabled={isFirst}
            >
              Back
            </Button>

            <div className="flex gap-2 sm:justify-end">
              {step.ctaPath && (
                <Button type="button" variant="outline" onClick={goCta}>
                  {step.ctaLabel || 'Open'}
                </Button>
              )}

              <Button
                type="button"
                onClick={() => {
                  if (isLast) close();
                  else setStepIndex((i) => Math.min(total - 1, i + 1));
                }}
              >
                {isLast ? 'Finish' : 'Next'}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
