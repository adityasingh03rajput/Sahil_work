import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { X, ChevronRight, ChevronLeft, Compass } from 'lucide-react';

interface TourStep {
  route: string;
  title: string;
  description: string;
  icon: string;
  position: 'center' | 'top-center' | 'bottom-center';
}

const STEPS: TourStep[] = [
  {
    route: '/dashboard',
    title: 'Command Center',
    description: 'Your dashboard gives a live snapshot — total subscribers, active vs expired vs suspended, platform-wide usage (profiles, documents, customers, items), revenue, and expiry alerts.',
    icon: '📊',
    position: 'top-center',
  },
  {
    route: '/dashboard',
    title: 'Expiry Alerts & Quick Actions',
    description: 'The bottom row shows licenses expiring in 7 and 30 days so you can act proactively. Quick Action cards let you jump to any section instantly.',
    icon: '⚡',
    position: 'bottom-center',
  },
  {
    route: '/subscribers',
    title: 'Subscribers',
    description: 'Every user who has activated a license key appears here. Search by name, email, or phone. Filter by status. Suspend or reactivate any subscriber instantly — changes take effect immediately.',
    icon: '🏢',
    position: 'top-center',
  },
  {
    route: '/subscribers',
    title: 'Subscriber Details',
    description: 'Click "Manage" on any subscriber to see their full profile, license info (plan, start, expiry, days remaining), usage stats, and business profiles.',
    icon: '📋',
    position: 'bottom-center',
  },
  {
    route: '/users',
    title: 'All Users',
    description: 'Every registered Bill Vyapar user — including trial users who never activated a key. See their profiles, documents, and customer counts. If they have a license, jump straight to their subscriber record.',
    icon: '👥',
    position: 'top-center',
  },
  {
    route: '/license-keys',
    title: 'License Keys',
    description: 'Generate keys in BVYP-XXXX-XXXX-XXXX format. Assign to an email, set duration in days, add notes. Keys start as "pending" until activated. You can revoke any active key — access is cut off immediately.',
    icon: '🗝️',
    position: 'top-center',
  },
  {
    route: '/data',
    title: 'Platform Data',
    description: 'Read-only aggregate stats across the entire platform — documents by type, customers, suppliers, items, payments, bank transactions. Use this to understand platform health at a glance.',
    icon: '📈',
    position: 'top-center',
  },
  {
    route: '/audit',
    title: 'Audit Logs',
    description: 'Every admin action is recorded — suspensions, password resets, key generation, limit changes. Each entry shows who did it, when, and what changed. Fully tamper-evident.',
    icon: '📜',
    position: 'top-center',
  },
  {
    route: '/admin-accounts',
    title: 'Admin Accounts',
    description: 'Super admin only. Create additional admins with role-based access: Admin (full access) or Support (read-only). Disable or re-enable any account. The super admin itself cannot be disabled.',
    icon: '🛡️',
    position: 'top-center',
  },
  {
    route: '/dashboard',
    title: "You're all set!",
    description: "That's the full tour. Use ⌘K to search any page instantly. The sidebar toggle keeps your workspace clean. Come back to this tour anytime from the Tour button.",
    icon: '🎉',
    position: 'center',
  },
];

function cardPos(position: TourStep['position']) {
  const base = 'fixed z-[301] w-full max-w-lg px-4';
  if (position === 'top-center')    return `${base} top-8 left-1/2 -translate-x-1/2`;
  if (position === 'bottom-center') return `${base} bottom-8 left-1/2 -translate-x-1/2`;
  return `${base} top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2`;
}

interface TourProps { onClose: () => void }

export function AdminTour({ onClose }: TourProps) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const [idx, setIdx]   = useState(0);
  const [fade, setFade] = useState(false);

  const step   = STEPS[idx];
  const isLast = idx === STEPS.length - 1;

  useEffect(() => {
    if (step.route !== location.pathname) navigate(step.route);
  }, [idx]);

  const go = useCallback((dir: 1 | -1) => {
    setFade(true);
    setTimeout(() => { setIdx(i => i + dir); setFade(false); }, 160);
  }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') { if (!isLast) go(1); }
      if (e.key === 'ArrowLeft') { if (idx > 0) go(-1); }
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [go, onClose, isLast, idx]);

  const pct = Math.round(((idx + 1) / STEPS.length) * 100);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[300]"
        style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(3px)' }}
        onClick={onClose} />

      {/* Card */}
      <div className={cardPos(step.position)}
        style={{ transition: 'opacity 160ms ease, transform 160ms ease', opacity: fade ? 0 : 1, transform: fade ? 'scale(0.97)' : 'scale(1)' }}
        onClick={e => e.stopPropagation()}>

        <div style={{
          background: 'rgba(255,255,255,0.97)',
          backdropFilter: 'blur(20px)',
          borderRadius: 24,
          border: '1.5px solid rgba(255,255,255,0.9)',
          boxShadow: '0 32px 80px rgba(99,102,241,0.22), 0 8px 24px rgba(0,0,0,0.1)',
          overflow: 'hidden',
        }}>

          {/* Header */}
          <div style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', padding: '20px 24px 16px' }}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
                  style={{ background: 'rgba(255,255,255,0.2)' }}>
                  {step.icon}
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.6)' }}>
                    Step {idx + 1} of {STEPS.length}
                  </p>
                  <h2 className="text-base font-black text-white leading-tight mt-0.5">{step.title}</h2>
                </div>
              </div>
              <button onClick={onClose}
                className="p-1.5 rounded-xl flex-shrink-0 transition-all"
                style={{ color: 'rgba(255,255,255,0.7)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.2)'; (e.currentTarget as HTMLElement).style.color = '#fff'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.7)'; }}>
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>

            {/* Progress bar */}
            <div className="mt-4 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }}>
              <div className="h-full rounded-full transition-all duration-300"
                style={{ width: `${pct}%`, background: 'rgba(255,255,255,0.9)' }} />
            </div>
          </div>

          {/* Body */}
          <div style={{ padding: '20px 24px' }}>
            <p className="text-sm leading-relaxed" style={{ color: '#374151' }}>{step.description}</p>
          </div>

          {/* Step dots */}
          <div className="flex items-center gap-1.5 px-6 pb-2 flex-wrap">
            {STEPS.map((_, i) => (
              <button key={i} onClick={() => { setFade(true); setTimeout(() => { setIdx(i); setFade(false); }, 160); }}
                style={{
                  height: 6,
                  width: i === idx ? 24 : 6,
                  borderRadius: 99,
                  background: i === idx ? '#6366f1' : i < idx ? '#a5b4fc' : '#e2e8f0',
                  transition: 'all 250ms ease',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }} />
            ))}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4"
            style={{ borderTop: '1.5px solid #f1f5f9', background: '#fafbff' }}>
            <button onClick={() => go(-1)} disabled={idx === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{ color: idx === 0 ? '#cbd5e1' : '#64748b', cursor: idx === 0 ? 'not-allowed' : 'pointer' }}
              onMouseEnter={e => { if (idx > 0) (e.currentTarget as HTMLElement).style.background = '#f1f5f9'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
              <ChevronLeft style={{ width: 15, height: 15 }} />Back
            </button>

            <span className="text-[10px] font-medium hidden sm:block" style={{ color: '#94a3b8' }}>← → to navigate · Esc to close</span>

            {isLast ? (
              <button onClick={onClose}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-bold text-white transition-all"
                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 4px 14px rgba(99,102,241,0.4)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.9'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}>
                Finish 🎉
              </button>
            ) : (
              <button onClick={() => go(1)}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-bold text-white transition-all"
                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 4px 14px rgba(99,102,241,0.4)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.9'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}>
                Next <ChevronRight style={{ width: 15, height: 15 }} />
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

interface TourButtonProps { onClick: () => void }

export function TourButton({ onClick }: TourButtonProps) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all"
      style={{ background: '#eef2ff', color: '#6366f1', border: '1.5px solid #c7d2fe', boxShadow: '0 2px 8px rgba(99,102,241,0.15)' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#c7d2fe'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#eef2ff'; }}>
      <Compass style={{ width: 13, height: 13 }} />Tour
    </button>
  );
}
