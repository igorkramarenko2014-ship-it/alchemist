/**
 * Validate candidates: discard invalid / out-of-range.
 * Normalised score in [0, 1]; state and reasoning must be present.
 * Consensus Validator: check FxCk param array against Serum physical limits (0–1).
 *
 * **Gate integrity:** strict schema + param integrity + reasoning structure — fail-closed; PNH
 * **`GATE_BYPASS_PAYLOAD`** logs on high-severity structural rejects (`pnh_gate_bypass_reject`).
 */
import type { AICandidate, Panelist } from "@alchemist/shared-types";
import { getSegmentEntropyFloor, inferGateSegment } from "./gates";
import { logEvent } from "./telemetry";
import { triagePolicyForFindingId } from "./pnh/pnh-triage-matrix";

/** Undercover legibility: agents must explain choices (FIRE — auditable, not empty slogans). */
export const REASONING_LEGIBILITY_MIN_CHARS = 15;

/** Hard cap — prevents multi-megabyte reasoning exfil / DoS. */
export const REASONING_MAX_CHARS = 16_000;

/** FxCk vectors longer than this are rejected as injection / abuse (Serum slot ≈128). */
export const MAX_PARAM_ARRAY_LENGTH = 256;

/** Serum normalised param range (shared-types: 0.0–1.0 unless units require otherwise). */
const PARAM_MIN = 0;
const PARAM_MAX = 1;

const PANELISTS = new Set<Panelist>(["LLAMA", "DEEPSEEK", "QWEN"]);

function isHighSeverityGateFailure(code: string): boolean {
  if (code.startsWith("param_non_finite_") || code.startsWith("param_out_of_range_")) return true;
  return (
    code === "bad_panelist" ||
    code === "candidate_not_object" ||
    code === "score_non_finite" ||
    code === "score_out_of_range" ||
    code === "state_shape" ||
    code === "description_type" ||
    code === "description_too_long" ||
    code === "paramArray_not_array" ||
    code === "paramArray_too_long" ||
    code === "param_array_zero_variance"
  );
}

/**
 * Required top-level **`SerumState`** keys — partial objects fail gate integrity (fail-closed).
 */
export function isStrictSerumStateShape(s: unknown): boolean {
  if (s === null || typeof s !== "object") return false;
  const o = s as Record<string, unknown>;
  const needObj = ["meta", "master", "oscA", "oscB", "noise", "filter", "fx"] as const;
  for (const k of needObj) {
    const v = o[k];
    if (v === null || typeof v !== "object" || Array.isArray(v)) return false;
  }
  if (!Array.isArray(o.envelopes) || !Array.isArray(o.lfos) || !Array.isArray(o.matrix)) return false;
  return true;
}

/**
 * Reasoning must meet legibility length, max size, contain real letters, and avoid NUL injection.
 */
export function validateReasoningStructure(reasoning: string): boolean {
  if (typeof reasoning !== "string") return false;
  if (/\0/.test(reasoning)) return false;
  const t = reasoning.trim();
  if (t.length < REASONING_LEGIBILITY_MIN_CHARS) return false;
  if (t.length > REASONING_MAX_CHARS) return false;
  const letters = t.replace(/[^a-zA-Z]/g, "");
  if (letters.length < 2) return false;
  return true;
}

export interface ParamViolation {
  paramIndex: number;
  value: number;
  message: string;
}

export interface ConsensusValidationResult {
  valid: boolean;
  reasoning: string;
  violations: ParamViolation[];
}

/** Check a single FxCk param is within Serum physical range [0, 1]. */
function checkParam(index: number, value: number): ParamViolation | null {
  if (!Number.isFinite(value)) {
    return {
      paramIndex: index,
      value,
      message: `param[${index}] is not a finite number (NaN/±Infinity rejected)`,
    };
  }
  if (value < PARAM_MIN || value > PARAM_MAX) {
    return {
      paramIndex: index,
      value,
      message: `param[${index}]=${value} outside Serum range [${PARAM_MIN}, ${PARAM_MAX}]`,
    };
  }
  return null;
}

/**
 * Validate FxCk param array against Serum physical limits.
 * Prevents silent crashes from out-of-range values.
 */
export function validateSerumParamArray(params: number[]): {
  valid: boolean;
  violations: ParamViolation[];
} {
  const violations: ParamViolation[] = [];
  for (let i = 0; i < params.length; i++) {
    const v = checkParam(i, params[i]);
    if (v) violations.push(v);
  }
  return {
    valid: violations.length === 0,
    violations,
  };
}

/**
 * Consensus Validator — delegates to **`getGateIntegrityFailure`** (strict schema + params + reasoning).
 * Param-range detail lines are redundant once integrity passes; violations array stays empty for brevity.
 */
export function consensusValidateCandidate(candidate: AICandidate): ConsensusValidationResult {
  const fail = getGateIntegrityFailure(candidate);
  if (fail !== null) {
    return {
      valid: false,
      reasoning: `Gate integrity rejected: ${fail}`,
      violations: [],
    };
  }
  return { valid: true, reasoning: "Consensus: valid.", violations: [] };
}

/** Reject degenerate param arrays (FIRE / FIRESTARTER adversarial gate). */
export const ADVERSARIAL_VARIANCE_MIN = 0.002;
/** Default segment floor when no prompt context (`gates.ts` DEFAULT). */
export const ADVERSARIAL_ENTROPY_MIN = getSegmentEntropyFloor("DEFAULT");

// ─── Undercover CAI — distribution gate (FIRESTARTER §3a Layer 1) ────────────

/** Mean must stay in (0.2, 0.8); edge saturation; uniqueness of rounded cents. */
export function passesDistributionGate(paramArray: number[]): boolean {
  const n = paramArray.length;
  if (n < 8) return true;
  const mean = paramArray.reduce((s, v) => s + v, 0) / n;
  if (mean < 0.2 || mean > 0.8) return false;
  const edgeCount = paramArray.filter((v) => v < 0.05 || v > 0.95).length;
  if (edgeCount / n > 0.4) return false;
  const unique = new Set(paramArray.map((v) => Math.round(v * 100))).size;
  if (unique / n < 0.1) return false;
  return true;
}

export function candidatePassesDistributionGate(c: AICandidate): boolean {
  if (c.paramArray == null || !Array.isArray(c.paramArray) || c.paramArray.length < 8) {
    return true;
  }
  return passesDistributionGate(c.paramArray);
}

// ─── Slavic — contextual entropy threshold (FIRESTARTER §3a Layer 2) ─────────

/**
 * Intent-aware minimum entropy for `passesAdversarialSanity` (segmented calibration).
 */
export function getContextualEntropyThreshold(prompt: string): number {
  return getSegmentEntropyFloor(inferGateSegment(prompt));
}

/** Population variance of normalised params. */
export function varianceParamArray(arr: number[]): number {
  if (arr.length < 2) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  return arr.reduce((s, x) => s + (x - mean) ** 2, 0) / arr.length;
}

/**
 * Structural check for **`paramArray`** when present: type, density, finite, in-range, max length.
 * Empty array is allowed (treated as absent for downstream gates).
 */
export function validateParamArrayStructuralIntegrity(
  paramArray: unknown,
): { ok: true; values: number[] } | { ok: false; code: string } {
  if (paramArray === undefined || paramArray === null) return { ok: true, values: [] };
  if (!Array.isArray(paramArray)) return { ok: false, code: "paramArray_not_array" };
  if (paramArray.length > MAX_PARAM_ARRAY_LENGTH) {
    return { ok: false, code: "paramArray_too_long" };
  }
  const values: number[] = [];
  for (let i = 0; i < paramArray.length; i++) {
    const x = paramArray[i];
    if (typeof x !== "number" || !Number.isFinite(x)) {
      return { ok: false, code: `param_non_finite_${i}` };
    }
    if (x < PARAM_MIN || x > PARAM_MAX) {
      return { ok: false, code: `param_out_of_range_${i}` };
    }
    values.push(x);
  }
  if (values.length >= 8) {
    const v = varianceParamArray(values);
    if (v === 0 || v < 1e-15) {
      return { ok: false, code: "param_array_zero_variance" };
    }
  }
  return { ok: true, values };
}

/**
 * Single-candidate gate integrity code, or **`null`** if the row passes structural + core gates.
 * Used by **`isValidCandidate`**, **`consensusValidateCandidate`**, and PNH-aligned telemetry.
 */
export function getGateIntegrityFailure(candidate: AICandidate): string | null {
  if (candidate == null || typeof candidate !== "object") return "candidate_not_object";
  if (!PANELISTS.has(candidate.panelist)) return "bad_panelist";
  if (typeof candidate.score !== "number" || !Number.isFinite(candidate.score)) return "score_non_finite";
  if (candidate.score < 0 || candidate.score > 1) return "score_out_of_range";
  if (!isStrictSerumStateShape(candidate.state)) return "state_shape";
  if (candidate.description != null && typeof candidate.description !== "string") {
    return "description_type";
  }
  if (candidate.description != null && candidate.description.length > REASONING_MAX_CHARS) {
    return "description_too_long";
  }
  const pa = validateParamArrayStructuralIntegrity(candidate.paramArray);
  if (pa.ok === false) return pa.code;
  if (!validateReasoningStructure(candidate.reasoning)) return "reasoning_structure";
  return null;
}

/**
 * Shannon entropy (bits) over 10 bins in [0,1) — coarse but cheap sanity check.
 */
export function entropyParamArray(arr: number[]): number {
  if (arr.length === 0) return 0;
  const bins = new Array(10).fill(0);
  for (const x of arr) {
    const i = Math.min(9, Math.max(0, Math.floor(Number(x) * 10)));
    bins[i] += 1;
  }
  let h = 0;
  const n = arr.length;
  for (const c of bins) {
    if (c === 0) continue;
    const p = c / n;
    h -= p * Math.log2(p);
  }
  return h;
}

/**
 * When a candidate carries `paramArray`, require variance + entropy thresholds.
 * `entropyMin` defaults to global floor; pass `getContextualEntropyThreshold(prompt)` for Slavic intent.
 */
export function passesAdversarialSanity(
  paramArray: number[],
  entropyMin: number = ADVERSARIAL_ENTROPY_MIN
): boolean {
  if (paramArray.length < 8) return true;
  const v = varianceParamArray(paramArray);
  const e = entropyParamArray(paramArray);
  return v >= ADVERSARIAL_VARIANCE_MIN && e >= entropyMin;
}

/** Optional `prompt` enables contextual entropy (Slavic); omit for fixed 1.5 floor. */
export function candidatePassesAdversarial(c: AICandidate, prompt?: string): boolean {
  if (c.paramArray == null || !Array.isArray(c.paramArray) || c.paramArray.length === 0) {
    return true;
  }
  const entropyMin =
    prompt != null && prompt.trim().length > 0
      ? getContextualEntropyThreshold(prompt)
      : getSegmentEntropyFloor("DEFAULT");
  return passesAdversarialSanity(c.paramArray, entropyMin);
}

/**
 * Triad / panelist entry gate — strict schema, param integrity, reasoning structure (**fail-closed**).
 * See **`getGateIntegrityFailure`** for rejection codes.
 */
export function isValidCandidate(c: AICandidate): boolean {
  return getGateIntegrityFailure(c) === null;
}

// ─── Gatekeeper — telemetry (score stream before Slavic / weighting) ─────────

/** Returned by `scoreCandidatesWithGate` when the batch is statistically unusable. */
export const STATUS_NOISY = "STATUS_NOISY" as const;

/** Need this many finite scores before IQR / sliding-Z apply (short triad lists stay unblocked). */
export const GATEKEEPER_MIN_SAMPLES = 5;

/** Baseline window − 1 = points used to estimate μ, σ for the next score. */
export const GATEKEEPER_WINDOW = 5;

/** Max |z| vs rolling baseline; above → outlier spike. */
export const GATEKEEPER_Z_MAX = 3.5;

/** Tukey fence multiplier on IQR (global pass). */
export const GATEKEEPER_IQR_K = 1.5;

/** Reject bot-like / impossible panelist wall-clock samples (ms). Not API latency budgets. */
export const GATEKEEPER_MIN_DURATION_MS = 200;

function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

/** Population σ (cheap; n is tiny). */
function stdDevPop(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / xs.length);
}

function sortedCopy(xs: number[]): number[] {
  return [...xs].sort((a, b) => a - b);
}

/** Linear-interpolated quantile on sorted array, q ∈ [0,1]. */
function quantileSorted(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  const lo = sorted[base];
  const hi = sorted[Math.min(base + 1, sorted.length - 1)];
  return lo + rest * (hi - lo);
}

/** True if any point falls outside Tukey fences (global outlier). */
function hasTukeyOutlier(values: number[], k: number): boolean {
  const s = sortedCopy(values);
  const q1 = quantileSorted(s, 0.25);
  const q3 = quantileSorted(s, 0.75);
  const iqr = q3 - q1;
  if (iqr <= 1e-12) return false;
  const lo = q1 - k * iqr;
  const hi = q3 + k * iqr;
  return values.some((x) => x < lo || x > hi);
}

/**
 * Sliding-window spike: compare each point (from index window−1 onward) to μ,σ of the
 * preceding window−1 scores. Catches local telemetry glitches IQR may miss when bulk is tame.
 */
function hasRollingZSpike(values: number[], window: number, zMax: number): boolean {
  if (values.length < window || window < 2) return false;
  for (let i = window - 1; i < values.length; i++) {
    const baseline = values.slice(i - window + 1, i);
    const x = values[i];
    const sd = stdDevPop(baseline);
    if (sd < 1e-9) continue;
    const m = mean(baseline);
    if (Math.abs(x - m) / sd > zMax) return true;
  }
  return false;
}

/**
 * Statistical purity of a numeric telemetry series (here: panelist scores in arrival order).
 * Too few samples → pass (no false blocks on tiny batches).
 */
export function isTelemetryScoreSeriesPure(scores: number[]): boolean {
  const finite = scores.filter((x) => Number.isFinite(x));
  if (finite.length < GATEKEEPER_MIN_SAMPLES) return true;
  if (finite.length !== scores.length) return false; // caller should pre-check; kept for safety
  if (hasTukeyOutlier(finite, GATEKEEPER_IQR_K)) return false;
  if (hasRollingZSpike(finite, GATEKEEPER_WINDOW, GATEKEEPER_Z_MAX)) return false;
  return true;
}

/**
 * Temporal pacing for parallel `durationMs[]` (same order as candidates). Empty → pass.
 * Hard floor `GATEKEEPER_MIN_DURATION_MS`, then same IQR + rolling-Z machinery as scores.
 */
export function isTemporalFlowPure(durations: number[]): boolean {
  if (durations.length === 0) return true;
  if (!durations.every((d) => Number.isFinite(d))) return false;
  if (durations.some((d) => d < GATEKEEPER_MIN_DURATION_MS)) return false;
  if (durations.length < GATEKEEPER_MIN_SAMPLES) return true;
  if (hasTukeyOutlier(durations, GATEKEEPER_IQR_K)) return false;
  if (hasRollingZSpike(durations, GATEKEEPER_WINDOW, GATEKEEPER_Z_MAX)) return false;
  return true;
}

/**
 * Gatekeeper entry: score stream from candidates; optional **`durationMs`** (same length, same order).
 * Durations are never written onto `AICandidate` — caller supplies a parallel array.
 */
export function isTelemetryPureFromCandidates(
  candidates: AICandidate[],
  durationMs?: number[]
): boolean {
  const scores = candidates.map((c) => c.score);
  if (!scores.every(Number.isFinite)) return false;
  if (!isTelemetryScoreSeriesPure(scores)) return false;
  if (durationMs == null || durationMs.length === 0) return true;
  if (durationMs.length !== candidates.length) return false;
  return isTemporalFlowPure(durationMs);
}

/** Sprint alias — same as `isTelemetryPureFromCandidates`. */
export const isDataPure = isTelemetryPureFromCandidates;

/** Filter to valid candidates only — gate integrity + PNH **`pnh_gate_bypass_reject`** on high-severity drops. */
export function filterValid(candidates: AICandidate[]): AICandidate[] {
  const bypassPolicy = triagePolicyForFindingId("GATE_BYPASS_PAYLOAD");
  const bypassLogSeverity =
    bypassPolicy?.severity === "high"
      ? "high"
      : bypassPolicy?.severity === "medium"
        ? "medium"
        : "high";

  return candidates.filter((c) => {
    const fail = getGateIntegrityFailure(c);
    if (fail !== null) {
      if (isHighSeverityGateFailure(fail)) {
        logEvent("pnh_gate_bypass_reject", {
          scenarioId: "GATE_BYPASS_PAYLOAD",
          severity: bypassLogSeverity,
          reason: fail,
          panelist: c.panelist,
        });
      }
      return false;
    }
    return true;
  });
}

/**
 * Filter to candidates that pass full consensus validation (including param array if present).
 * Use when you have attached paramArray to candidates (e.g. after encoding state → FxCk).
 */
export function filterConsensusValid(candidates: AICandidate[]): AICandidate[] {
  return candidates.filter((c) => consensusValidateCandidate(c).valid);
}

/**
 * Build a single validation summary string for AIAnalysis from consensus results.
 */
export function buildValidationSummary(
  candidates: AICandidate[],
  results: ConsensusValidationResult[]
): string {
  if (candidates.length === 0) {
    return "No candidates remained after triad gates for consensus validation.";
  }
  const lines: string[] = [];
  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    const r = results[i];
    if (!r.valid) {
      lines.push(`${c.panelist}: ${r.reasoning}`);
      for (const v of r.violations) {
        lines.push(`  — ${v.message}`);
      }
    }
  }
  if (lines.length === 0) return "All candidates passed consensus validation.";
  return lines.join("\n");
}
