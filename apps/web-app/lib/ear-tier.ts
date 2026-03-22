export type EarTier = 'basic' | 'ultra';

/** Ripple / shader evolution speed factor (higher = faster surface motion). */
export function mercuryTransmutationRate(tier: EarTier): number {
  return tier === 'ultra' ? 1.35 : 0.42;
}

export function resolveMercuryTier(opts: {
  hasPresets: boolean;
  prefersReducedMotion: boolean;
  isWideViewport: boolean;
}): EarTier {
  if (opts.prefersReducedMotion) return 'basic';
  if (opts.hasPresets && opts.isWideViewport) return 'ultra';
  return 'basic';
}
