/**
 * High-variance conceptual seeds for Aji-style distillation (TS-only; no embeddings).
 * Count is clamped to [10, 20] per Module 05 spec.
 */

export const ENTROPY_MESS_MAX_LINES = 20;
export const ENTROPY_MESS_MAX_CHARS = 8000;

/** Curated “unconnected” labels — a few weak lexical overlaps exist for bridge tests. */
export const ENTROPY_POOL: readonly string[] = [
  "Liquid Mercury UI shell",
  "W124 Piston slap transient",
  "Serum Wavetable morph lane",
  "Slavic Village field recording",
  "Triad panel latency envelope",
  "Undercover CAI distribution gate",
  "Slavic cosine dedupe spine",
  "FXP encoder offset map",
  "Great Library taxonomy shard",
  "Transparent arbitration vote",
  "SOE recalibration telemetry",
  "Gatekeeper IQR score stream",
  "Mercury ball telemetry glow",
  "Serum macro matrix slot",
  "Hermes velocity API wall",
  "Athena governance weight lead",
  "Hestia frugality budget cap",
  "Preset fidelity rubric band",
  "Offline WASM node pack",
  "Stub panelist timing burst",
  "Neon bazaar preset scout",
  "Crystallizer residue line",
];

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/** Deterministic PRNG for reproducible entropy in tests and stable pivots. */
export function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function pickDistinctIndices(len: number, need: number, rng: () => number): number[] {
  const idx = Array.from({ length: len }, (_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx.slice(0, need);
}

/**
 * @param count — desired strings (clamped 10–20)
 * @param seed — deterministic selection when set (omit for time-based variety in hot paths)
 */
export function generateEntropy(count = 15, seed?: number): string[] {
  const n = clamp(Math.floor(count), 10, 20);
  const rng = mulberry32(seed ?? Date.now());
  const picks = pickDistinctIndices(ENTROPY_POOL.length, n, rng);
  return picks.map((i) => ENTROPY_POOL[i]!);
}
