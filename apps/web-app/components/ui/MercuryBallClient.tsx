'use client';

import dynamic from 'next/dynamic';

/**
 * R3F / WebGL orb — load only in the browser so SSR and hydration never touch WebGL.
 */
export const MercuryBallClient = dynamic(
  () => import('./MercuryBall').then((m) => ({ default: m.MercuryBall })),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex h-[196px] w-full items-center justify-center rounded-xl bg-[#111827]/40 text-xs text-gray-500 md:h-[252px]"
        aria-hidden
      >
        Loading orb…
      </div>
    ),
  }
);
