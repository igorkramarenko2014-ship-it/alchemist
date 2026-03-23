/**
 * Weighted scoring: rank by candidate.score * panelistWeight.
 * Slavic filter: cosine dedup on paramArray (FIRESTARTER §6). When both sides have legible
 * text (`description` or `reasoning` ≥ `REASONING_LEGIBILITY_MIN_CHARS`), also require high
 * Dice similarity on character bigrams — catches near-identical params with divergent intent copy
 * without pulling in external embedding models (transparent TS only).
 */
import type { AICandidate } from "@alchemist/shared-types";
import type { GameChanger } from "./aji-logic";
import { runAjiCrystallization } from "./aji-logic";
import { PANELIST_WEIGHTS } from "./constants";
import { generateEntropy } from "./entropy";
import { getSegmentCosineThreshold, slavicCosineThresholdForPrompt } from "./gates";
import {
  filterValid,
  isTelemetryPureFromCandidates,
  REASONING_LEGIBILITY_MIN_CHARS,
  STATUS_NOISY,
} from "./validate";

export function weightedScore(c: AICandidate): number {
  const w = PANELIST_WEIGHTS[c.panelist] ?? 0;
  return c.score * w;
}

/** Cosine similarity in [0,1] for aligned FxCk vectors (same length slice = min(len)). */
export function cosineSimilarityParamArrays(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const d = Math.sqrt(na * nb);
  return d === 0 ? 0 : dot / d;
}

/** FIRESTARTER / FIRE — DEFAULT segment cosine floor (use `slavicCosineThresholdForPrompt` when prompt known). */
export const SLAVIC_FILTER_COSINE_THRESHOLD = getSegmentCosineThreshold("DEFAULT");

/**
 * When legibility text exists on both candidates, require this Dice(bigram) floor to count as duplicate.
 * (Not neural “semantic” similarity — deterministic string geometry only.)
 */
export const SLAVIC_TEXT_DICE_THRESHOLD = 0.75;

/** Normalized legibility slice: optional `description`, else `reasoning`. */
export function slavicLegibilityText(c: AICandidate): string {
  const d = c.description?.trim();
  const r = c.reasoning?.trim() ?? "";
  const raw = d && d.length > 0 ? d : r;
  return raw.toLowerCase().replace(/\s+/g, " ").trim();
}

/** Dice coefficient on character bigrams, in [0,1]. Short inputs → 0. */
export function diceBigramSimilarity(a: string, b: string): number {
  if (a.length < 2 || b.length < 2) return 0;
  const counts = (s: string) => {
    const m = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i++) {
      const bg = s.slice(i, i + 2);
      m.set(bg, (m.get(bg) ?? 0) + 1);
    }
    return m;
  };
  const A = counts(a);
  const B = counts(b);
  let inter = 0;
  A.forEach((va, k) => {
    const vb = B.get(k);
    if (vb != null) inter += Math.min(va, vb);
  });
  const na = a.length - 1;
  const nb = b.length - 1;
  const denom = na + nb;
  return denom === 0 ? 0 : (2 * inter) / denom;
}

function slavicTextSimilarityFromStrings(sa: string, sb: string): number | null {
  if (sa.length < REASONING_LEGIBILITY_MIN_CHARS || sb.length < REASONING_LEGIBILITY_MIN_CHARS) {
    return null;
  }
  return diceBigramSimilarity(sa, sb);
}

/**
 * Keep higher weighted-score representatives; drop candidates whose paramArray is
 * almost identical to an already kept one (no paramArray → always kept).
 * With legible text on both sides, param similarity alone is insufficient — text must align too.
 */
export function slavicFilterDedupe(candidates: AICandidate[], prompt?: string): AICandidate[] {
  const cosineThreshold = slavicCosineThresholdForPrompt(prompt);
  const scored = [...candidates].sort((a, b) => weightedScore(b) - weightedScore(a));
  const legibility = new Map<AICandidate, string>();
  for (const c of scored) {
    legibility.set(c, slavicLegibilityText(c));
  }
  const kept: AICandidate[] = [];
  for (const c of scored) {
    const pa = c.paramArray;
    if (pa == null || !Array.isArray(pa) || pa.length === 0) {
      kept.push(c);
      continue;
    }
    const isDup = kept.some((k) => {
      const pk = k.paramArray;
      if (pk == null || !Array.isArray(pk) || pk.length === 0) return false;
      const paramClose = cosineSimilarityParamArrays(pa, pk) > cosineThreshold;
      if (!paramClose) return false;
      const ts = slavicTextSimilarityFromStrings(legibility.get(c)!, legibility.get(k)!);
      if (ts === null) return true;
      return ts > SLAVIC_TEXT_DICE_THRESHOLD;
    });
    if (!isDup) kept.push(c);
  }
  return kept;
}

export type ScoreCandidatesGateStatus = "OK" | typeof STATUS_NOISY;

/** Optional Aji-style residue when the scored batch is a dead end (gate fail or empty after filters). */
export type CreativePivot = GameChanger;

export interface ScoreCandidatesGatedResult {
  status: ScoreCandidatesGateStatus;
  candidates: AICandidate[];
  /** Present only when scoring produced no usable candidates but the caller offered a non-empty batch, or the gate rejected telemetry. */
  creativePivot?: CreativePivot;
}

function deadEndEntropySeed(prompt?: string): number {
  if (prompt == null || prompt.trim().length === 0) return 0xa11ce15;
  let h = 0xa11ce15;
  for (let i = 0; i < prompt.length; i++) {
    h = Math.imul(h, 31) + prompt.charCodeAt(i);
    h |= 0;
  }
  return h;
}

function buildCreativePivotForDeadEnd(prompt?: string): CreativePivot {
  const mess = generateEntropy(15, deadEndEntropySeed(prompt));
  const p = prompt?.trim();
  if (p) mess.push(p.slice(0, 120));
  return runAjiCrystallization(mess);
}

/**
 * Same pipeline as `scoreCandidates`, but surfaces **`STATUS_NOISY`** when the Gatekeeper
 * rejects the batch: scores (IQR + rolling Z) and, when provided, parallel **`durationMs`**
 * (floor + same stats). **`durationMs` is not mutated or attached** to candidates.
 */
export function scoreCandidatesWithGate(
  candidates: AICandidate[],
  prompt?: string,
  durationMs?: number[]
): ScoreCandidatesGatedResult {
  if (candidates.length === 0) {
    return { status: "OK", candidates: [] };
  }
  if (!isTelemetryPureFromCandidates(candidates, durationMs)) {
    return {
      status: STATUS_NOISY,
      candidates: [],
      creativePivot: buildCreativePivotForDeadEnd(prompt),
    };
  }
  const valid = filterValid(candidates);
  const deduped = slavicFilterDedupe(valid, prompt);
  if (deduped.length === 0) {
    return {
      status: "OK",
      candidates: [],
      creativePivot: buildCreativePivotForDeadEnd(prompt),
    };
  }
  return {
    status: "OK",
    candidates: deduped,
  };
}

/** Sort candidates by weighted score descending; invalid removed; Slavic cosine dedup applied. */
export function scoreCandidates(
  candidates: AICandidate[],
  prompt?: string,
  durationMs?: number[]
): AICandidate[] {
  return scoreCandidatesWithGate(candidates, prompt, durationMs).candidates;
}
