'use client';

import { useState } from 'react';
import type { Panelist } from '@alchemist/shared-types';
import { formatPanelistDisplayName } from '../../lib/panelist-ui';

interface PartialModeWarningProps {
  triadFullyLive: boolean;
  livePanelists: string[];
}

const ALL_PANELISTS: Panelist[] = ['DEEPSEEK', 'LLAMA', 'QWEN'];

/**
 * Renders a session-dismissible warning when one or more AI panelists are down.
 */
export function PartialModeWarning({ triadFullyLive, livePanelists }: PartialModeWarningProps) {
  const [dismissed, setDismissed] = useState(false);

  // If fully live, or user dismissed it in this session, show nothing.
  if (triadFullyLive || dismissed) return null;

  const missing = ALL_PANELISTS.filter((p) => !livePanelists.includes(p));
  if (missing.length === 0) return null;

  const names = missing
    .map((p) => formatPanelistDisplayName(p as Panelist) || p)
    .join(', ');

  return (
    <div
      role="alert"
      className="mb-4 flex flex-col gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-left backdrop-blur-sm"
    >
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-bold tracking-tight text-amber-400/90 uppercase">
          Partial Mode Active
        </p>
        <button
          onClick={() => setDismissed(true)}
          className="text-amber-400/40 transition-colors hover:text-amber-400/80"
          aria-label="Dismiss warning"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <p className="text-[12px] leading-relaxed text-amber-200/70">
        Running in Partial Mode: <span className="font-semibold text-amber-200">{names}</span> unavailable.
        Generation quality and diversity may be reduced.
      </p>
    </div>
  );
}
