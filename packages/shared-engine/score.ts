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
 *
 * **Transmutation Phase 2:** when **`options.transmutationProfile`** is set, panelist weights,
 * Slavic threshold delta, and prior weights are shifted by the advisory profile — all clamped
 * to `TRANSMUTATION_BOUNDS`. Gate law (validate / PNH / HARD GATE) is not affected.
 */
import type { AICandidate, Panelist, UserMode } from "@alchemist/shared-types";
import type { GameChanger } from "./aji-logic";
import { runAjiCrystallization } from "./aji-logic";
import { logEvent } from "./telemetry";
import { interpretTask } from "./transmutation/task-interpreter";
import { computeOutcomeAlignment } from "./transmutation/transmutation-outcome";
import { PANELIST_WEIGHTS } from "./constants";
import { TRANSMUTATION_BOUNDS } from "./transmutation/transmutation-bounds";
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
import { computeCorpusAffinity, type LearningIndexLesson } from "./learning/compute-corpus-affinity";
import { computeTasteAffinity } from "./learning/taste/compute-taste-affinity";
import type { TasteIndex } from "./learning/taste/taste-types";
import type { TransmutationProfile } from "./transmutation/transmutation-types";

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

/**
 * Returns the effective panelist weight for this candidate.
 * Phase 2: if transmutation profile is provided, uses its bounded triad_weights instead of the
 * global PANELIST_WEIGHTS constant — advisory shift only, not gate law.
 * Enforces TRANSMUTATION_BOUNDS.triad_weight_shift_max relative to baseline.
 */
export function effectivePanelistWeight(
  c: AICandidate,
  profile?: TransmutationProfile | null,
): number {
  const baseline = PANELIST_WEIGHTS[c.panelist] ?? 0;
  if (profile?.triad_weights) {
    const requested = profile.triad_weights[c.panelist];
    // Fallback: malformed numeric value (NaN/Infinity) -> use baseline
    if (requested == null || !Number.isFinite(requested)) {
      return baseline;
    }
    // Clamp: extreme numeric values -> bounded application
    const maxShift = TRANSMUTATION_BOUNDS.triad_weight_shift_max;
    return Math.min(baseline + maxShift, Math.max(baseline - maxShift, requested));
  }
  return baseline;
}

export function weightedScore(c: AICandidate, profile?: TransmutationProfile | null): number {
  const w = effectivePanelistWeight(c, profile);
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
export function slavicFilterDedupe(
  candidates: AICandidate[],
  prompt?: string,
  profile?: TransmutationProfile | null
): AICandidate[] {
  const cosineThreshold = slavicCosineThresholdForPrompt(prompt);
  const scored = [...candidates].sort((a, b) => weightedScore(b, profile) - weightedScore(a, profile));
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

/**
 * Phase 2 variant: same as `slavicFilterDedupe` but accepts a pre-computed cosine
 * threshold (from transmutation gate_offsets.slavic_threshold_delta). The original
 * `slavicFilterDedupe` is unchanged — this path is only taken when slavicDelta !== 0.
 */
function slavicFilterDedupeWithThreshold(
  candidates: AICandidate[],
  _prompt: string | undefined,
  cosineThreshold: number,
  profile?: TransmutationProfile | null,
): AICandidate[] {
  const scored = [...candidates].sort((a, b) => weightedScore(b, profile) - weightedScore(a, profile));
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
  /**
   * Phase 3 — optional corpus-affinity **re-rank** only (after Slavic + intent blend). **Never** admits rejected candidates.
   */
  corpusAffinityPrior?: boolean;
  learningLessons?: LearningIndexLesson[];
  /** Default **0.45** — nudge added to `candidate.score` for sort only (pairs with Fitness v1 affinity multipliers). */
  corpusAffinityWeight?: number;
  /**
   * Phase 4 — optional taste-affinity **re-rank** after corpus (same multiset). Opt-in server env
   * **`ALCHEMIST_TASTE_PRIOR=1`** + loaded index. Default nudge **0.06**.
   */
  tastePrior?: boolean;
  tasteIndex?: TasteIndex | null;
  /** Default **0.06** — added to `candidate.score` for sort only. */
  tasteWeight?: number;
  noveltyGateDelta?: number;
  runId?: string;
  /**
   * **Transmutation Phase 2** — advisory profile from `resolveTransmutation`. When present:
   * - `triad_weights` replaces `PANELIST_WEIGHTS` in intent-blend sort and corpus/taste resort
   * - `gate_offsets.slavic_threshold_delta` shifts the Slavic cosine threshold (bounded)
   * - `priors.corpus_affinity_weight` and `priors.taste_weight` override the Phase 3/4 defaults
   * Gate law (validate / PNH / HARD GATE) is not affected.
   */
  transmutationProfile?: TransmutationProfile | null;
}

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

/**
 * Panelist-weighted blend: **0.7 × model `score` + 0.3 × `intentAlignment`** (IOM MOVE 3).
 * Phase 2: uses `effectivePanelistWeight` so transmutation profile shifts are honoured.
 */
export function intentBlendRankKey(
  c: AICandidate,
  intentAlignment: number,
  profile?: TransmutationProfile | null,
  externalResonance?: number,
  externalRedZone?: number,
): number {
  const w = effectivePanelistWeight(c, profile);
  const resonance = clamp01(externalResonance ?? c.socialResonanceScore ?? 0.5);
  const redZone = clamp01(externalRedZone ?? c.redZoneResonanceScore ?? 0.5);
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
  const profile = opts?.transmutationProfile ?? null;
  const enriched = candidates.map((c) => {
    const ia = computeIntentAlignmentScore(p, c, opts);
    const resonance = detectCreativeResonance(p, c);
    const redZone = detectRedZoneResonance(p, c);
    const rank = intentBlendRankKey(c, ia, profile, resonance, redZone);
    return {
      ...c,
      intentAlignmentScore: ia,
      socialResonanceScore: resonance,
      redZoneResonanceScore: redZone,
      rank,
    };
  });

  enriched.sort((a, b) => {
    const d = b.rank - a.rank;
    if (d !== 0) return d;
    // Transmutation-adjusted fallback weighted score
    const wa = weightedScore(a, profile);
    const wb = weightedScore(b, profile);
    const wd = wb - wa;
    if (wd !== 0) return wd;
    return a.panelist.localeCompare(b.panelist);
  });
  return enriched;
}

/**
 * True if corpus affinity resort changed panelist order (advisory rerank only — input/output are the same multiset).
 * Exported for tests / audits proving ordering-only behavior.
 */
export function corpusAffinityOrderChanged(before: AICandidate[], after: AICandidate[]): boolean {
  if (before.length !== after.length) return true;
  return before.some((c, i) => c.panelist !== after[i]!.panelist);
}

/** Same as `corpusAffinityOrderChanged` — taste resort is ordering-only on the survivor multiset. */
export function tasteAffinityOrderChanged(before: AICandidate[], after: AICandidate[]): boolean {
  return corpusAffinityOrderChanged(before, after);
}

function worstCorpusConfidenceTier(
  lessons: LearningIndexLesson[],
): "low" | "medium" | "high" {
  let worstRank = 3;
  let worst: "low" | "medium" | "high" = "high";
  for (const l of lessons) {
    const c = l.fitnessConfidence;
    const r = c === "high" ? 2 : c === "medium" ? 1 : 0;
    if (r < worstRank) {
      worstRank = r;
      worst = c === "high" ? "high" : c === "medium" ? "medium" : "low";
    }
  }
  return lessons.length ? worst : "low";
}

function applyCorpusAffinityResort(
  candidates: AICandidate[],
  options?: ScoreCandidatesOptions,
): AICandidate[] {
  const lessons = options?.learningLessons;
  const enabled =
    options?.corpusAffinityPrior === true && lessons != null && lessons.length > 0;
  if (!enabled || candidates.length <= 1) return candidates;
  const profile = options?.transmutationProfile ?? null;
  /**
   * Phase 2: if a transmutation profile overrides corpus_affinity_weight, use it.
   * Explicit `options.corpusAffinityWeight` still takes precedence (caller override wins).
   */
  const defaultWeight = profile?.priors?.corpus_affinity_weight ?? 0.45;
  const weight = options?.corpusAffinityWeight ?? defaultWeight;
  const effectiveWeight = weight;
  try {
    const rows = candidates.map((c) => ({
      c,
      a: computeCorpusAffinity(c, lessons!),
    }));
    rows.sort((x, y) => {
      const adjX = x.c.score + x.a * effectiveWeight;
      const adjY = y.c.score + y.a * effectiveWeight;
      if (adjY !== adjX) return adjY - adjX;
      // Phase 2: transmutation-shifted weighted score for tiebreak
      const wx = effectivePanelistWeight(x.c, profile) * x.c.score;
      const wy = effectivePanelistWeight(y.c, profile) * y.c.score;
      const wd = wy - wx;
      if (wd !== 0) return wd;
      return x.c.panelist.localeCompare(y.c.panelist);
    });
    const afterCandidates = rows.map((r) => r.c);
    const orderChanged = corpusAffinityOrderChanged(candidates, afterCandidates);
    const topBefore = candidates[0];
    const topAfter = afterCandidates[0];
    const lessonIdsUsed = lessons!.map((l) => l.id).slice(0, 16);
    logEvent("score_candidates", {
      corpusAffinityApplied: true,
      corpusAffinityWeight: weight,
      corpusAffinityEffectiveWeight: effectiveWeight,
      corpusAffinityFitnessWeighted: true,
      corpusAffinityConfidenceTier: worstCorpusConfidenceTier(lessons!),
      corpusAffinityOrderChanged: orderChanged,
      corpusAffinityTopPanelistBefore: candidates[0]?.panelist,
      corpusAffinityTopPanelistAfter: afterCandidates[0]?.panelist,
      topCandidateScoreBefore: topBefore?.score,
      topCandidateScoreAfter: topAfter?.score,
      lessonIdsUsed,
      tasteClusterHit: null,
      survivorCount: candidates.length,
      corpusAffinityLessonCount: lessons!.length,
      corpusAffinityPriorityAware: lessons!.some(
        (l) => Array.isArray(l.priorityMappingKeys) && l.priorityMappingKeys.length > 0,
      ),
    });
    return afterCandidates;
  } catch {
    return candidates;
  }
}

function applyTasteAffinityResort(
  candidates: AICandidate[],
  options?: ScoreCandidatesOptions,
): AICandidate[] {
  const idx = options?.tasteIndex;
  const enabled = options?.tastePrior === true && idx != null;
  if (!enabled || candidates.length <= 1) return candidates;
  const profile = options?.transmutationProfile ?? null;
  /**
   * Phase 2: if a transmutation profile overrides taste_weight, use it.
   * Explicit `options.tasteWeight` still takes precedence (caller override wins).
   */
  const defaultWeight = profile?.priors?.taste_weight ?? 0.06;
  const weight = options?.tasteWeight ?? defaultWeight;
  try {
    const rows = candidates.map((c) => ({
      c,
      t: computeTasteAffinity(c, idx!, { nudgeWeight: weight }),
    }));
    rows.sort((x, y) => {
      const adjX = x.c.score + x.t.score * x.t.effectiveWeight;
      const adjY = y.c.score + y.t.score * y.t.effectiveWeight;
      if (adjY !== adjX) return adjY - adjX;
      const wd = weightedScore(y.c) - weightedScore(x.c);
      if (wd !== 0) return wd;
      return x.c.panelist.localeCompare(y.c.panelist);
    });
    const afterCandidates = rows.map((r) => r.c);
    const firstT = rows.find((r) => r.c === afterCandidates[0])?.t ?? rows[0]!.t;
    const orderChanged = tasteAffinityOrderChanged(candidates, afterCandidates);
    logEvent("score_candidates", {
      tasteAffinityApplied: true,
      tasteClusterHit: firstT.dominantCluster,
      tasteEffectiveWeight: firstT.effectiveWeight,
      tasteConfidenceTier: null,
      tasteAffinityOrderChanged: orderChanged,
      tasteAffinityTopPanelistBefore: candidates[0]?.panelist,
      tasteAffinityTopPanelistAfter: afterCandidates[0]?.panelist,
      survivorCount: candidates.length,
    });
    return afterCandidates;
  } catch {
    return candidates;
  }
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

function isProfileMalformed(p: TransmutationProfile): boolean {
  if (!p.triad_weights || typeof p.triad_weights !== "object") return true;
  if (!p.gate_offsets || typeof p.gate_offsets !== "object") return true;
  if (!p.priors || typeof p.priors !== "object") return true;
  
  // Weights check: must have all three mandatory panelists
  for (const k of ["LLAMA", "DEEPSEEK", "QWEN"] as Panelist[]) {
    const w = p.triad_weights[k];
    if (w == null || !Number.isFinite(w)) return true;
  }
  
  return false;
}

/**
 * Same pipeline as `scoreCandidates`, but surfaces **`STATUS_NOISY`** when the Gatekeeper
 * rejects the batch: scores (IQR + rolling Z) and, when provided, parallel **`durationMs`**
 * (floor + same stats). **`durationMs` is not mutated or attached** to candidates.
 *
 * **Transmutation Phase 2:** if `options.transmutationProfile` is set, the Slavic cosine
 * threshold is shifted by `gate_offsets.slavic_threshold_delta` before dedup.
 * Gate law (validate / PNH / HARD GATE) is unchanged.
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

  const profile = options?.transmutationProfile;
  const isFallback = !profile || isProfileMalformed(profile);
  const effectiveProfile = isFallback ? null : profile;

  // Phase 2: apply Slavic threshold shift from transmutation profile (bounded; advisory only)
  const slavicDeltaRaw = effectiveProfile?.gate_offsets?.slavic_threshold_delta ?? 0;
  const slavicDelta = Math.max(-0.03, Math.min(0.03, slavicDeltaRaw)); // TRANSMUTATION_BOUNDS.single_threshold_delta_max
  const baseSlavicThreshold = slavicCosineThresholdForPrompt(p);
  const effectiveSlavicThreshold = Math.max(0.5, Math.min(0.99, baseSlavicThreshold + slavicDelta));

  const deduped =
    slavicDelta === 0
      ? slavicFilterDedupe(valid, prompt, effectiveProfile)
      : slavicFilterDedupeWithThreshold(valid, prompt, effectiveSlavicThreshold, effectiveProfile);

  if (deduped.length === 0) {
    return {
      status: "OK",
      candidates: [],
      creativePivot: buildCreativePivotForDeadEnd(prompt),
    };
  }

  const optionsWithProfile = { ...options, transmutationProfile: effectiveProfile };
  const blended = applyIntentBlendSort(deduped, prompt, optionsWithProfile);
  const withCorpus = applyCorpusAffinityResort(blended, optionsWithProfile);
  const ranked = applyTasteAffinityResort(withCorpus, optionsWithProfile);

  if (profile) {
    const weights: Record<string, number> = {};
    const weightClamped: Record<string, boolean> = {};
    for (const p of ["LLAMA", "DEEPSEEK", "QWEN"] as Panelist[]) {
      const baseline = PANELIST_WEIGHTS[p] ?? 0;
      const effective = effectivePanelistWeight({ panelist: p } as AICandidate, effectiveProfile);
      weights[p] = effective;
      const requested = profile.triad_weights?.[p];
      weightClamped[p] = !isFallback && requested != null && Number.isFinite(requested) && (requested > baseline + 0.12 || requested < baseline - 0.12);
    }
    
    logEvent("transmutation_scoring_applied", {
      status: isFallback ? "fallback_baseline" : "applied",
      policy_family: profile ? (isFallback ? "CORRUPT" : "active") : "none",
      // Resolved vs Effective (Audit Trail)
      resolved_slavic_delta: profile.gate_offsets?.slavic_threshold_delta ?? 0,
      effective_slavic_delta: slavicDelta,
      slavic_clamped: !isFallback && (profile.gate_offsets?.slavic_threshold_delta ?? 0) !== slavicDelta,
      
      resolved_weights: profile.triad_weights,
      effective_weights: weights,
      weights_clamped: Object.values(weightClamped).some(v => v),
      
      resolved_priors: profile.priors,
      effective_priors: {
        corpus_affinity_weight: options?.corpusAffinityWeight ?? (effectiveProfile?.priors?.corpus_affinity_weight ?? 0.45),
        taste_weight: options?.tasteWeight ?? (effectiveProfile?.priors?.taste_weight ?? 0.06),
      },
      priors_clamped: false, 
      
      survivor_count: ranked.length,
      fallback_reason: isFallback ? (profile ? "malformed_shape" : "missing_profile") : undefined,
      note: "Audit trail: resolved intent vs bounded effective application."
    });

    // MOVE 3: Intent Alignment (Outcome Signal)
    const winner = ranked[0];
    if (winner && deduped.length > 0) {
      const taskSchemaSnapshot = interpretTask(p ?? "");
      const survivorAlignments = deduped.map(c => 
        computeOutcomeAlignment(taskSchemaSnapshot, c).final
      );
      const winnerAlignment = computeOutcomeAlignment(taskSchemaSnapshot, winner);
      const survivorMeanAlignment = survivorAlignments.reduce((a, b) => a + b, 0) / survivorAlignments.length;

      logEvent("transmutation_outcome_alignment", {
        runId: options?.runId ?? "none",
        status: isFallback ? "fallback_baseline" : "applied",
        alignmentFinal: winnerAlignment.final,
        alignmentConfidence: winnerAlignment.confidence,
        breakdown: winnerAlignment.breakdown,
        taskSchemaSnapshot: taskSchemaSnapshot,
        alignmentGainV1: winnerAlignment.final - survivorMeanAlignment,
        survivorMeanAlignment: survivorMeanAlignment,
        policyFamily: profile ? (isFallback ? "CORRUPT" : "active") : "none",
        note: "Evaluation of behavior shift correctness (MOVE 3)."
      });
    }
  }

  return {
    status: "OK",
    candidates: ranked,
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

export type { LearningIndexLesson } from "./learning/compute-corpus-affinity";
export { computeTasteAffinity } from "./learning/taste/compute-taste-affinity";
export type { TasteAffinityResult } from "./learning/taste/compute-taste-affinity";
export type { TasteIndex } from "./learning/taste/taste-types";
