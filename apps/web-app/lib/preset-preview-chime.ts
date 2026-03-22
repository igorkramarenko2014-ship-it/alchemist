import type { AICandidate } from '@alchemist/shared-types';

export interface ChimeHandle {
  stop: () => void;
}

/** Short Web Audio preview from param vector (not Serum render). */
export function playPresetChime(ctx: AudioContext, candidate: AICandidate): ChimeHandle {
  const params = candidate.paramArray ?? [0.5, 0.45, 0.55, 0.48, 0.52];
  const f0 = 160 + (params[0] ?? 0.5) * 240;
  const f1 = f0 * (1.5 + (params[1] ?? 0.5) * 0.4);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.38);
  gain.connect(ctx.destination);

  const osc1 = ctx.createOscillator();
  osc1.type = 'triangle';
  osc1.frequency.setValueAtTime(f0, ctx.currentTime);
  osc1.connect(gain);

  const osc2 = ctx.createOscillator();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(f1, ctx.currentTime);
  const g2 = ctx.createGain();
  g2.gain.setValueAtTime(0.04, ctx.currentTime);
  osc2.connect(g2);
  g2.connect(gain);

  osc1.start(ctx.currentTime);
  osc2.start(ctx.currentTime);
  osc1.stop(ctx.currentTime + 0.4);
  osc2.stop(ctx.currentTime + 0.4);

  return {
    stop: () => {
      try {
        osc1.stop();
        osc2.stop();
      } catch {
        /* already stopped */
      }
      gain.disconnect();
    },
  };
}
