'use client';

import type { ReactNode } from 'react';

export interface MercuryBallShellProps {
  children: ReactNode;
  /** 0–1 MIDI / voice brightness for chrome ring */
  midiNorm: number;
  isHot?: boolean;
  idleTranslucent?: boolean;
  onOrbActivate?: () => void;
  ariaLabel?: string;
  className?: string;
}

export function MercuryBallShell({
  children,
  midiNorm,
  isHot,
  idleTranslucent,
  onOrbActivate,
  ariaLabel,
  className = '',
}: MercuryBallShellProps) {
  const glow = Math.min(1, midiNorm + (isHot ? 0.22 : 0));
  const spread = 20 + glow * 48;
  const alpha = 0.07 + glow * 0.2;

  return (
    <div className={`relative ${className}`}>
      <div
        className="rounded-2xl transition-[box-shadow] duration-300"
        style={{
          boxShadow: `0 0 ${spread}px rgba(94, 234, 212, ${alpha})`,
        }}
      >
        <button
          type="button"
          className={`relative block w-full cursor-pointer border-0 bg-transparent p-0 text-left outline-none ring-offset-2 ring-offset-[#111827] focus-visible:ring-2 focus-visible:ring-[#5EEAD4]/70 ${idleTranslucent && !isHot ? 'opacity-[0.92]' : ''} ${!onOrbActivate ? 'cursor-default' : ''}`}
          onClick={onOrbActivate}
          disabled={!onOrbActivate}
          aria-label={ariaLabel}
        >
          {children}
        </button>
      </div>
    </div>
  );
}
