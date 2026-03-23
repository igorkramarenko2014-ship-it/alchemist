'use client';

import type { TriadHealthState } from '@/hooks/useTriadHealth';

export type TriadStatusBadgeProps = TriadHealthState;

/**
 * Renders triad key status from GET /api/health (parent should call useTriadHealth once).
 */
export function TriadStatusBadge({
  loading,
  error,
  triadFullyLive,
  livePanelists,
  panelistRoutes,
}: TriadStatusBadgeProps) {

  const base =
    'inline-flex max-w-full items-center gap-2 rounded-lg border px-2.5 py-1 text-left text-[11px] leading-tight';

  if (loading) {
    return (
      <div
        role="status"
        aria-live="polite"
        className={`${base} border-gray-700 bg-[#111827] text-gray-400`}
      >
        <span className="h-2 w-2 shrink-0 rounded-full bg-gray-500" aria-hidden />
        <span>Triad: checking…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="status"
        aria-live="polite"
        className={`${base} border-gray-700 bg-[#111827] text-gray-400`}
        title={panelistRoutes ? `Routes: ${panelistRoutes}` : undefined}
      >
        <span className="h-2 w-2 shrink-0 rounded-full bg-gray-500" aria-hidden />
        <span>Triad status unavailable</span>
      </div>
    );
  }

  if (triadFullyLive) {
    return (
      <div
        role="status"
        aria-live="polite"
        className={`${base} border-emerald-500/40 bg-[#111827] text-emerald-200`}
        title={`Panel routes: ${panelistRoutes}`}
      >
        <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" aria-hidden />
        <span>All live (3/3)</span>
      </div>
    );
  }

  if (livePanelists.length > 0) {
    const n = livePanelists.length;
    return (
      <div
        role="status"
        aria-live="polite"
        className={`${base} border-amber-500/35 bg-[#111827] text-amber-100`}
        title={`Live: ${livePanelists.join(', ')} · routes: ${panelistRoutes}`}
      >
        <span className="h-2 w-2 shrink-0 rounded-full bg-amber-400" aria-hidden />
        <span>
          Partial ({n}/3)
        </span>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={`${base} border-red-900/40 bg-[#111827] text-red-200/90`}
      title="Provider keys missing — POST /api/triad/* returns 503 triad_unconfigured"
    >
      <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" aria-hidden />
      <span>DEGRADED (0/3)</span>
    </div>
  );
}
