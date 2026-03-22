/**
 * Validate candidates: discard invalid / out-of-range.
 * Normalised score in [0, 1]; state and reasoning must be present.
 * Consensus Validator: check FxCk param array against Serum physical limits (0–1).
 */
import type { AICandidate } from "@alchemist/shared-types";

/** Undercover legibility: agents must explain choices (FIRE — auditable, not empty slogans). */
export const REASONING_LEGIBILITY_MIN_CHARS = 15;

/** Serum normalised param range (shared-types: 0.0–1.0 unless units require otherwise). */
const PARAM_MIN = 0;
const PARAM_MAX = 1;

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
 * Consensus Validator: sanity-check a candidate (score, state, reasoning, and optional param array).
 * Returns detailed reasoning explaining exactly which Serum offset/param was violated, if any.
 */
export function consensusValidateCandidate(candidate: AICandidate): ConsensusValidationResult {
  const violations: ParamViolation[] = [];
  const parts: string[] = [];

  if (candidate.score < 0 || candidate.score > 1) {
    parts.push(`Score ${candidate.score} outside [0, 1].`);
  }
  if (!candidate.state || typeof candidate.reasoning !== "string") {
    parts.push("Missing state or reasoning.");
  }
  if (typeof candidate.reasoning === "string" && candidate.reasoning.trim().length === 0) {
    parts.push("Empty reasoning.");
  }

  if (candidate.paramArray != null && Array.isArray(candidate.paramArray)) {
    const { valid, violations: paramViolations } = validateSerumParamArray(candidate.paramArray);
    if (!valid) {
      violations.push(...paramViolations);
      for (const v of paramViolations) {
        parts.push(`FxCk param[${v.paramIndex}]=${v.value} out of range [${PARAM_MIN}, ${PARAM_MAX}].`);
      }
    }
  }

  const valid = parts.length === 0;
  const reasoning = valid
    ? "Consensus: valid."
    : `Consensus invalid: ${parts.join(" ")}`;

  return {
    valid,
    reasoning,
    violations,
  };
}

/** Reject degenerate param arrays (FIRE / FIRESTARTER adversarial gate). */
export const ADVERSARIAL_VARIANCE_MIN = 0.002;
export const ADVERSARIAL_ENTROPY_MIN = 1.5;

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
 * Intent-aware minimum entropy for `passesAdversarialSanity` (focus vs complexity).
 */
export function getContextualEntropyThreshold(prompt: string): number {
  const p = prompt.toLowerCase();
  if (/\b(bass|lead|pluck|key)\b/.test(p)) return 1.2;
  if (/\b(fx|texture|ambient|pad|atmo)\b/.test(p)) return 1.8;
  return ADVERSARIAL_ENTROPY_MIN;
}

/** Population variance of normalised params. */
export function varianceParamArray(arr: number[]): number {
  if (arr.length < 2) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  return arr.reduce((s, x) => s + (x - mean) ** 2, 0) / arr.length;
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
      : ADVERSARIAL_ENTROPY_MIN;
  return passesAdversarialSanity(c.paramArray, entropyMin);
}

/** Score must be in [0, 1]. State and reasoning required. No param-array check (use consensusValidateCandidate for that). */
export function isValidCandidate(c: AICandidate): boolean {
  if (c.score < 0 || c.score > 1) return false;
  if (!c.state || typeof c.reasoning !== "string") return false;
  if (c.reasoning.trim().length < REASONING_LEGIBILITY_MIN_CHARS) return false;
  return true;
}

/** Filter to valid candidates only (basic checks; does not run consensus param validation). */
export function filterValid(candidates: AICandidate[]): AICandidate[] {
  return candidates.filter(isValidCandidate);
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
