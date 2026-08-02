// Lightweight skeleton primitives — pulsing slate placeholders that match the
// app's dark theme. Use while data is loading instead of "Loading…" text.

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-slate-700/60 ${className}`} />;
}

/**
 * Skeleton rows for a <tbody>. Renders `rows` <tr> each with `cols` cells.
 * Drop straight into a table body while loading.
 */
export function SkeletonTableRows({
  rows = 6,
  cols,
}: {
  rows?: number;
  cols: number;
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className="border-t border-slate-700">
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c} className="px-2 py-2">
              <Skeleton className={`h-3.5 ${c === 0 ? 'w-16' : 'w-full max-w-[140px]'}`} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/** A block of stacked skeleton lines — for non-table loading areas. */
export function SkeletonLines({
  lines = 4,
  className = '',
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={`h-4 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </div>
  );
}

/** A grid of skeleton cards — for KPI/summary loading areas. */
export function SkeletonCards({
  count = 4,
  className = '',
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-slate-800 border border-slate-700 rounded p-3">
          <Skeleton className="h-3 w-20 mb-2" />
          <Skeleton className="h-5 w-28" />
        </div>
      ))}
    </div>
  );
}
