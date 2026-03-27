import type { AICandidate } from "@alchemist/shared-types";

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3);
}

function jaccard(a: string[], b: string[]): number {
  const A = new Set(a);
  const B = new Set(b);
  const inter = Array.from(A).filter((x) => B.has(x)).length;
  const union = new Set([...Array.from(A), ...Array.from(B)]).size;
  return union === 0 ? 0 : inter / union;
}

function uncommonPairingScore(paramArray: number[] | undefined): number {
  if (!Array.isArray(paramArray) || paramArray.length < 8) return 0.2;
  const n = paramArray.length;
  const mean = paramArray.reduce((a, b) => a + b, 0) / n;
  const variance = paramArray.reduce((s, x) => s + (x - mean) ** 2, 0) / n;
  const hi = paramArray.filter((v) => v > 0.85).length / n;
  const lo = paramArray.filter((v) => v < 0.15).length / n;
  const tension = Math.min(1, Math.abs(hi - lo) + Math.min(1, hi + lo));
  return clamp01(0.45 * Math.min(1, variance * 10) + 0.55 * tension);
}

/**
 * SPA: deterministic resonance score from existing prompt + candidate only.
 * No new LLM calls, no gate mutation.
 */
export function detectCreativeResonance(prompt: string, candidate: AICandidate): number {
  const promptTokens = tokenize(prompt);
  const reasoningTokens = tokenize(candidate.reasoning ?? "");
  const semanticDistance = 1 - jaccard(promptTokens, reasoningTokens);
  const unusual = uncommonPairingScore(candidate.paramArray);
  const legibility = Math.min(1, (candidate.reasoning?.trim().length ?? 0) / 80);
  return clamp01(0.5 * unusual + 0.3 * semanticDistance + 0.2 * legibility);
}

export function isMutedResponse(score: number, threshold = 0.2): boolean {
  return score < threshold;
}

function keywordEchoRatio(prompt: string, reasoning: string): number {
  const p = tokenize(prompt);
  const r = tokenize(reasoning);
  if (p.length === 0 || r.length === 0) return 0;
  const pSet = new Set(p);
  const hit = r.filter((t) => pSet.has(t)).length;
  return clamp01(hit / Math.max(r.length, 1));
}

function standardPairingRatio(paramArray: number[] | undefined): number {
  if (!Array.isArray(paramArray) || paramArray.length < 8) return 0.5;
  const n = paramArray.length;
  const nearCenter = paramArray.filter((v) => v >= 0.38 && v <= 0.62).length / n;
  const lowVariance = uncommonPairingScore(paramArray) < 0.2 ? 1 : 0;
  return clamp01(0.75 * nearCenter + 0.25 * lowVariance);
}

function inverseAggressionSignal(prompt: string, candidate: AICandidate): number {
  const tensionTokens =
    /(aggressive|harsh|grit|distort|contrast|friction|asymmetric|counter|dissonant)/i.test(
      candidate.reasoning ?? ""
    )
      ? 1
      : 0;
  const semanticDistance = 1 - jaccard(tokenize(prompt), tokenize(candidate.reasoning ?? ""));
  const uncommon = uncommonPairingScore(candidate.paramArray);
  return clamp01(0.35 * tensionTokens + 0.35 * semanticDistance + 0.3 * uncommon);
}

/**
 * SPA v2: favors high-tension useful divergence while penalizing mechanical grooming.
 */
export function detectRedZoneResonance(prompt: string, candidate: AICandidate): number {
  const groomingBehavior = clamp01(
    0.6 * keywordEchoRatio(prompt, candidate.reasoning ?? "") +
      0.4 * standardPairingRatio(candidate.paramArray)
  );
  const inverseAggression = inverseAggressionSignal(prompt, candidate);
  return clamp01(0.75 * inverseAggression + 0.25 * (1 - groomingBehavior));
}
