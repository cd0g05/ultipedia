// Loading skeletons (ux.md UI States: "Skeleton card placeholders in the
// grid (same card dimensions, no layout shift)"). One skeleton card mirrors
// EntryCard's exact frame (header strip → title → two description lines →
// badge row) so the swap to real cards is dimension-stable. The pulse
// animation is suppressed under prefers-reduced-motion.
//
// Each block renders a visually-hidden "Loading…" status for screen readers;
// the decorative placeholders themselves are aria-hidden.

function Pulse({ className }: { className: string }) {
  return (
    <div
      className={`animate-pulse bg-film-panel motion-reduce:animate-none ${className}`}
    />
  );
}

/** Dimension-matched stand-in for one EntryCard. */
export function SkeletonCard() {
  return (
    <div
      aria-hidden="true"
      className="border border-film-border bg-white"
      data-testid="skeleton-card"
    >
      {/* type-label strip */}
      <div className="border-b border-film-border bg-film-panel px-3 py-2">
        <Pulse className="h-[22px] w-16 bg-zinc-300" />
      </div>
      <div className="p-4">
        {/* title */}
        <Pulse className="mb-2 h-5 w-3/4" />
        {/* two description lines */}
        <Pulse className="mb-1 h-3 w-full" />
        <Pulse className="mb-3 h-3 w-5/6" />
        {/* badge/tag row */}
        <div className="flex gap-1.5">
          <Pulse className="h-[21px] w-16" />
          <Pulse className="h-[21px] w-14" />
          <Pulse className="h-[21px] w-12" />
        </div>
      </div>
    </div>
  );
}

/** Grid of skeleton cards matching the real results-grid layout classes. */
export function SkeletonGrid({
  count = 6,
  label = "Loading results",
  gridClassName = "grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3",
}: {
  count?: number;
  label?: string;
  /** Must mirror the real results grid's layout classes (no layout shift). */
  gridClassName?: string;
}) {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">{label}…</span>
      <div aria-hidden="true" className={gridClassName}>
        {Array.from({ length: count }, (_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}

/** Entry detail loading state matching the final template's layout: crumb
 * row → title → badge row → sticky media block + text column. */
export function EntryDetailSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="mx-auto max-w-[1400px] px-6 py-10"
    >
      <span className="sr-only">Loading entry…</span>
      <div aria-hidden="true">
        {/* breadcrumb row */}
        <Pulse className="mb-6 h-6 w-64" />
        {/* title */}
        <Pulse className="mb-6 h-14 w-3/4 max-w-2xl" />
        {/* badge row */}
        <div className="mb-8 flex gap-2">
          <Pulse className="h-8 w-24" />
          <Pulse className="h-8 w-20" />
          <Pulse className="h-8 w-28" />
        </div>
        <div className="flex flex-col gap-12 md:flex-row md:items-start">
          {/* media block */}
          <Pulse className="aspect-video w-full md:w-5/12" />
          {/* info column */}
          <div className="w-full md:w-7/12">
            <Pulse className="mb-12 h-16 w-full" />
            <Pulse className="mb-4 h-4 w-full" />
            <Pulse className="mb-4 h-4 w-11/12" />
            <Pulse className="mb-4 h-4 w-full" />
            <Pulse className="h-4 w-2/3" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Inline error + retry block (ux.md Feedback Patterns: inline message in
 * the affected region with an in-context recovery action — never a blank
 * page, never toast-only). */
export function InlineError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div role="alert" className="border border-film-border bg-film-panel p-6">
      <p className="font-mono text-sm font-bold uppercase tracking-wider text-zinc-900">
        {message}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 bg-film-accentPink px-6 py-2.5 font-mono text-sm font-bold uppercase tracking-wider text-white transition-colors hover:bg-film-accentPinkDark"
      >
        Retry
      </button>
    </div>
  );
}
