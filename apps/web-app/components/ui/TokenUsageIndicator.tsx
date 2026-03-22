'use client';

import { useCallback, useEffect, useState } from 'react';

type UsagePayload = {
  tokensLine?: string;
  display?: string;
  label?: string;
};

export type TokenUsageIndicatorProps = {
  /** `fixed` = viewport corner (legacy). `inline` = same row as title (video ref). */
  variant?: 'fixed' | 'inline';
  className?: string;
};

/**
 * Token pill: green status + caps line (video ref IMG_2892).
 */
export function TokenUsageIndicator({
  variant = 'fixed',
  className = '',
}: TokenUsageIndicatorProps) {
  const [line, setLine] = useState('Tokens D 0/100 000 · M 0/2 000 000');

  const refresh = useCallback(() => {
    void fetch('/api/usage', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: UsagePayload | null) => {
        if (!j) return;
        if (j.tokensLine) setLine(j.tokensLine);
        else if (j.display) setLine(j.display);
        else if (j.label) setLine(j.label);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    refresh();
    const onUpdate = () => refresh();
    window.addEventListener('alchemist:usage-update', onUpdate);
    return () => window.removeEventListener('alchemist:usage-update', onUpdate);
  }, [refresh]);

  const position =
    variant === 'fixed'
      ? 'pointer-events-none fixed right-3 top-3 z-50'
      : 'pointer-events-none relative z-10 shrink-0';

  return (
    <div
      role="status"
      className={`${position} flex max-w-[min(calc(100vw-2.5rem),17.5rem)] select-none items-center gap-2 rounded-full border border-slate-600/90 bg-[#1e293b]/95 px-3 py-2 text-left shadow-sm backdrop-blur-sm sm:max-w-[19rem] ${className}`}
      aria-live="polite"
    >
      <span className="relative flex h-2 w-2 shrink-0" aria-hidden>
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.85)]" />
      </span>
      <span className="min-w-0 tabular-nums text-[11px] font-medium leading-snug tracking-tight text-slate-100">
        {line}
      </span>
    </div>
  );
}
