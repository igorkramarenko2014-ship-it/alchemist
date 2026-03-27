/**
 * Weighted scoring: rank by candidate.score * panelistWeight.
 * Slavic filter: cosine dedup on paramArray (FIRESTARTER §6). When both sides have legible
 * text (`description` or `reasoning` ≥ `REASONING_LEGIBILITY_MIN_CHARS`), also require high
 * Dice similarity on character bigrams — catches near-identical params with divergent intent copy
 * without pulling in external embedding models (transparent TS only).
 *
 * **Intent alignment (IOM MOVE 3):** when **`prompt`** is non-empty, after Slavic dedupe each survivor
 * gets **`intentAlignmentScore`** and is re-sorted by **`intentBlendRankKey`** (**0.7 × model score +
 * 0.3 × alignment**), scaled by panelist weight — not a gate override.
 */
import type { AICandidate, UserMode } from "@alchemist/shared-types";
import type { GameChanger } from "./aji-logic";
import { runAjiCrystallization } from "./aji-logic";
import { PANELIST_WEIGHTS } from "./constants";
import { generateEntropy } from "./entropy";
import { getSegmentCosineThreshold, slavicCosineThresholdForPrompt } from "./gates";
import { computeIntentAlignmentScore } from "./intent-alignment";
import { detectCreativeResonance, detectRedZoneResonance } from "./arbitration/social-probe";
import {
  filterValid,
  isTelemetryPureFromCandidates,
  REASONING_LEGIBILITY_MIN_CHARS,
  STATUS_NOISY,
} from "./validate";
import { validateTriadIntent } from "./intent-hardener";
import { hashPromptForTelemetry } from "./pnh/pnh-triad-defense";
import type { PnhTriadLane } from "./pnh/pnh-context-types";
import { logEvent } from "./telemetry";

/** Same panelist + identical param fingerprint (or score+reasoning slice) — second row dropped. */
function gateDuplicateFingerprint(c: AICandidate): string {
  if (c.paramArray != null && c.paramArray.length >= 8) {
    return `${c.panelist}|${c.paramArray.map((x) => x.toFixed(5)).join(",")}`;
  }
  const r = c.reasoning.trim().slice(0, 240);
  return `${c.panelist}|${c.score}|${r}`;
}

function dropDuplicateGateFingerprints(candidates: AICandidate[]): AICandidate[] {
  const seen = new Set<string>();
  const out: AICandidate[] = [];
  for (const c of candidates) {
    const fp = gateDuplicateFingerprint(c);
    if (seen.has(fp)) {
      logEvent("pnh_gate_duplicate_drop", {
        scenarioId: "GATE_BYPASS_PAYLOAD",
        severity: "medium",
        panelist: c.panelist,
      });
      continue;
    }
    seen.add(fp);
    out.push(c);
  }
  return out;
}

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
/**
 * If params are effectively identical, collapse regardless of descriptive copy.
 * This closes "same DSP DNA, different metadata" mirror leakage.
 */
export const SLAVIC_PARAMS_MIRROR_THRESHOLD = 0.9999;

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
      const paramMirror = cosineSimilarityParamArrays(pa, pk) > SLAVIC_PARAMS_MIRROR_THRESHOLD;
      if (paramMirror) return true;
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

/** Optional **`userMode`** nudge for **`computeIntentAlignmentScore`** (PRO/NEWBIE lexicon hints). */
export interface ScoreCandidatesOptions {
  userMode?: UserMode;
  /**
   * **`validateTriadIntent`** lane for the pre-scoring PNH guard — match **`runTriad`** / client telemetry
   * (**`stub`** when **`triadParityMode === "stub"`**) so stub runs are not scored with **`fully_live`** only rules.
   */
  pnhScoringLane?: PnhTriadLane;
}

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

/**
 * Panelist-weighted blend: **0.7 × model `score` + 0.3 × `intentAlignment`** (IOM MOVE 3).
 */
export function intentBlendRankKey(c: AICandidate, intentAlignment: number): number {
  const w = PANELIST_WEIGHTS[c.panelist] ?? 0;
  const resonance = clamp01(c.socialResonanceScore ?? 0.5);
  const redZone = clamp01(c.redZoneResonanceScore ?? 0.5);
  const core = 0.7 * clamp01(c.score) + 0.3 * clamp01(intentAlignment);
  const spaBonus = 0.07 * resonance + 0.08 * redZone;
  return w * Math.min(1, core + spaBonus);
}

function applyIntentBlendSort(
  candidates: AICandidate[],
  prompt: string | undefined,
  opts?: ScoreCandidatesOptions,
): AICandidate[] {
  const p = prompt?.trim() ?? "";
  if (p.length === 0 || candidates.length <= 1) {
    return candidates;
  }
  const enriched = candidates.map((c) => ({
    ...c,
    intentAlignmentScore: computeIntentAlignmentScore(p, c, opts),
    socialResonanceScore: detectCreativeResonance(p, c),
    redZoneResonanceScore: detectRedZoneResonance(p, c),
  }));
  enriched.sort((a, b) => {
    const ia = a.intentAlignmentScore ?? 0.5;
    const ib = b.intentAlignmentScore ?? 0.5;
    const d = intentBlendRankKey(b, ib) - intentBlendRankKey(a, ia);
    if (d !== 0) return d;
    const wd = weightedScore(b) - weightedScore(a);
    if (wd !== 0) return wd;
    return a.panelist.localeCompare(b.panelist);
  });
  return enriched;
}

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
  durationMs?: number[],
  options?: ScoreCandidatesOptions
): ScoreCandidatesGatedResult {
  const p = prompt?.trim() ?? "";
  if (p.length > 0) {
    const scoringLane: PnhTriadLane = options?.pnhScoringLane ?? "fully_live";
    const gate = validateTriadIntent({ prompt: p }, { pnhTriadLane: scoringLane });
    if (gate.ok === false) {
      logEvent("pnh_scoring_guard", {
        interventionType: "scoring_guard_blocked",
        reason: gate.reason,
        detail: gate.detail,
        originalPromptHash: hashPromptForTelemetry(p),
      });
      return {
        status: "OK",
        candidates: [],
        creativePivot: buildCreativePivotForDeadEnd(prompt),
      };
    }
  }
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
  const valid = dropDuplicateGateFingerprints(filterValid(candidates));
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
    candidates: applyIntentBlendSort(deduped, prompt, options),
  };
}

/** Sort candidates by weighted score descending; invalid removed; Slavic cosine dedup applied. */
export function scoreCandidates(
  candidates: AICandidate[],
  prompt?: string,
  durationMs?: number[],
  options?: ScoreCandidatesOptions
): AICandidate[] {
  return scoreCandidatesWithGate(candidates, prompt, durationMs, options).candidates;
}
