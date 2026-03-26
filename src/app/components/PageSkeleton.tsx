/**
 * PageSkeleton — instant shimmer placeholders shown while page data loads.
 * Matches the visual shape of each page so navigation feels zero-delay.
 */

const shimmerStyles = `
@keyframes skeletonShimmer {
  0%   { background-position: -800px 0; }
  100% { background-position: 800px 0; }
}
.skeleton-shimmer {
  background-color: #1e293b;
  background-image: linear-gradient(
    90deg,
    #1e293b 0px,
    #334155 200px,
    #1e293b 400px
  );
  background-size: 800px 100%;
  animation: skeletonShimmer 1.6s linear infinite;
  border-radius: 8px;
}
`;

// Inject keyframe styles once
if (typeof document !== 'undefined' && !document.getElementById('skeleton-shimmer-styles')) {
  const style = document.createElement('style');
  style.id = 'skeleton-shimmer-styles';
  style.textContent = shimmerStyles;
  document.head.appendChild(style);
}

/** Generic shimmer box — clearly visible on dark theme */
function Shimmer({ className = '' }: { className?: string }) {
  return (
    <div
      className={`skeleton-shimmer ${className}`}
      aria-hidden="true"
    />
  );
}


// ── Card row (used in Documents list) ───────────────────────────────────────
function CardRowSkeleton() {
  return (
    <div className="rounded-xl border border-border p-4 space-y-2 bg-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shimmer className="h-5 w-28" />
          <Shimmer className="h-5 w-16 rounded-full" />
        </div>
        <Shimmer className="h-5 w-20" />
      </div>
      <div className="flex items-center gap-2">
        <Shimmer className="h-4 w-24" />
        <Shimmer className="h-4 w-2 rounded-full" />
        <Shimmer className="h-4 w-20" />
      </div>
      <Shimmer className="h-4 w-16" />
    </div>
  );
}

// ── Stats card (used in Dashboard) ──────────────────────────────────────────
function StatCardSkeleton() {
  return (
    <div className="rounded-xl border border-border p-5 bg-card space-y-3">
      <Shimmer className="h-4 w-24" />
      <Shimmer className="h-7 w-36" />
      <Shimmer className="h-4 w-20" />
    </div>
  );
}

// ── Item card (used in Items page grid) ─────────────────────────────────────
function ItemCardSkeleton() {
  return (
    <div className="rounded-xl border border-border p-4 bg-card space-y-3">
      <div className="flex items-center gap-3">
        <Shimmer className="h-12 w-12 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Shimmer className="h-5 w-32" />
          <Shimmer className="h-3 w-20" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Shimmer className="h-3 w-8" />
          <Shimmer className="h-5 w-16" />
        </div>
        <div className="space-y-1">
          <Shimmer className="h-3 w-8" />
          <Shimmer className="h-5 w-10" />
        </div>
      </div>
      <div className="border-t pt-2 grid grid-cols-3 gap-2">
        {[0, 1, 2].map(i => (
          <div key={i} className="space-y-1">
            <Shimmer className="h-3 w-10" />
            <Shimmer className="h-4 w-8" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Customer card (used in Customers page) ───────────────────────────────────
function CustomerCardSkeleton() {
  return (
    <div className="rounded-xl border border-border p-4 bg-card space-y-3">
      <div className="flex items-center gap-3">
        <Shimmer className="h-12 w-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Shimmer className="h-5 w-36" />
          <Shimmer className="h-3 w-24" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Shimmer className="h-4 w-4 rounded" />
          <Shimmer className="h-4 w-32" />
        </div>
        <div className="flex items-center gap-2">
          <Shimmer className="h-4 w-4 rounded" />
          <Shimmer className="h-4 w-24" />
        </div>
      </div>
    </div>
  );
}

// ── Page-level skeletons ─────────────────────────────────────────────────────

/** Documents list skeleton */
export function DocumentsPageSkeleton() {
  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-2">
          <Shimmer className="h-8 w-40" />
          <Shimmer className="h-4 w-56" />
        </div>
        <Shimmer className="h-10 w-36 rounded-lg" />
      </div>
      {/* Filters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {[0, 1, 2, 3].map(i => <Shimmer key={i} className="h-10" />)}
      </div>
      {/* List */}
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => <CardRowSkeleton key={i} />)}
      </div>
    </div>
  );
}

/** Items catalog skeleton */
export function ItemsPageSkeleton() {
  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-2">
          <Shimmer className="h-8 w-40" />
          <Shimmer className="h-4 w-52" />
        </div>
        <Shimmer className="h-10 w-28 rounded-lg" />
      </div>
      {/* Search */}
      <Shimmer className="h-12 w-full rounded-xl mb-6" />
      {/* Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => <ItemCardSkeleton key={i} />)}
      </div>
    </div>
  );
}

/** Customers / Parties skeleton */
export function CustomersPageSkeleton() {
  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-2">
          <Shimmer className="h-8 w-36" />
          <Shimmer className="h-4 w-52" />
        </div>
        <Shimmer className="h-10 w-36 rounded-lg" />
      </div>
      {/* Search + filter */}
      <div className="flex gap-3 mb-4">
        <Shimmer className="h-10 flex-1" />
        <Shimmer className="h-10 w-32" />
      </div>
      {/* Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => <CustomerCardSkeleton key={i} />)}
      </div>
    </div>
  );
}

/** Analytics page skeleton */
export function AnalyticsPageSkeleton() {
  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div className="space-y-2 mb-6">
        <Shimmer className="h-8 w-36" />
        <Shimmer className="h-4 w-52" />
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <Shimmer className="h-64 rounded-xl" />
        <Shimmer className="h-64 rounded-xl" />
      </div>
    </div>
  );
}

/** Generic list page skeleton (fallback) */
export function GenericPageSkeleton() {
  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-2">
          <Shimmer className="h-8 w-40" />
          <Shimmer className="h-4 w-52" />
        </div>
        <Shimmer className="h-10 w-32 rounded-lg" />
      </div>
      <Shimmer className="h-10 w-full rounded-xl" />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => <CardRowSkeleton key={i} />)}
      </div>
    </div>
  );
}
