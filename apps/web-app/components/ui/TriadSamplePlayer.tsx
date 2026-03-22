'use client';

import { useRef, useState } from 'react';
import type { AICandidate } from '@alchemist/shared-types';
import { playPresetChime } from '../../lib/preset-preview-chime';
import { formatPanelistDisplayName } from '../../lib/panelist-ui';

export function TriadSamplePlayer({
  candidates,
  variant = 'dock',
}: {
  candidates: AICandidate[];
  variant?: 'dock' | 'inline';
}) {
  const ctxRef = useRef<AudioContext | null>(null);
  const [playing, setPlaying] = useState<number | null>(null);

  async function playAt(i: number, c: AICandidate) {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    if (!ctxRef.current) ctxRef.current = new Ctx();
    const ctx = ctxRef.current;
    if (ctx.state === 'suspended') await ctx.resume().catch(() => undefined);
    playPresetChime(ctx, c);
    setPlaying(i);
    window.setTimeout(() => setPlaying((p) => (p === i ? null : p)), 420);
  }

  if (candidates.length === 0) return null;

  return (
    <div className={variant === 'dock' ? 'space-y-2' : 'flex flex-wrap gap-2'}>
      <p className="text-[11px] uppercase tracking-wide text-gray-500">Web chimes (param vector)</p>
      <div className="flex flex-wrap gap-2">
        {candidates.slice(0, 6).map((c, i) => (
          <button
            key={`${c.panelist}-${i}`}
            type="button"
            onClick={() => void playAt(i, c)}
            className="rounded-full border border-gray-700 bg-[#111827] px-3 py-1.5 text-xs text-[#5EEAD4]/90 transition-colors hover:border-[#5EEAD4]/50"
          >
            {playing === i ? '…' : formatPanelistDisplayName(c.panelist)}
          </button>
        ))}
      </div>
    </div>
  );
}
