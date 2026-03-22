'use client';

import { useEffect, useState } from 'react';
import { resolveMercuryTier, type EarTier } from '../lib/ear-tier';

export function useResolvedMercuryTier(hasPresets: boolean): EarTier {
  const [tier, setTier] = useState<EarTier>('basic');

  useEffect(() => {
    const mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    const mqWide = window.matchMedia('(min-width: 768px)');

    const update = () => {
      setTier(
        resolveMercuryTier({
          hasPresets,
          prefersReducedMotion: mqReduce.matches,
          isWideViewport: mqWide.matches,
        }),
      );
    };

    update();
    mqReduce.addEventListener('change', update);
    mqWide.addEventListener('change', update);
    return () => {
      mqReduce.removeEventListener('change', update);
      mqWide.removeEventListener('change', update);
    };
  }, [hasPresets]);

  return tier;
}
