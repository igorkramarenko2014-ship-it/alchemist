/**
 * System integrity signals — auditable JSON lines (same transport as `telemetry.ts`).
 * This tracks **pipeline** honesty and completion, not model “loyalty” or hidden scores.
 *
 * Use when the engine takes a documented fallback or explicitly refuses work (capability gap).
 */
import { logEvent } from "./telemetry";

/** High-level outcome for dashboards / SOE-style aggregates (transparent, not shadow governance). */
export type IntegrityOutcome =
  | "honest_capability_gap"
  | "sprint_complete"
  | "degraded_fallback";

export interface IntegrityLogPayload {
  outcome: IntegrityOutcome;
  /** Short machine-readable reason (e.g. `temporal_gate_retry_score_only`). */
  reason?: string;
  /** Optional module or file path for filtering. */
  module?: string;
}

let honestGaps = 0;
let sprintOks = 0;
let degradedFallbacks = 0;

/** Test isolation — resets in-memory counters only. */
export function resetIntegrityMetricsForTests(): void {
  honestGaps = 0;
  sprintOks = 0;
  degradedFallbacks = 0;
}

export interface IntegrityHealthSnapshot {
  honestCapabilityGaps: number;
  sprintCompletions: number;
  degradedFallbacks: number;
}

export function getIntegrityHealthSnapshot(): IntegrityHealthSnapshot {
  return {
    honestCapabilityGaps: honestGaps,
    sprintCompletions: sprintOks,
    degradedFallbacks,
  };
}

function bump(outcome: IntegrityOutcome): void {
  if (outcome === "honest_capability_gap") honestGaps += 1;
  else if (outcome === "sprint_complete") sprintOks += 1;
  else if (outcome === "degraded_fallback") degradedFallbacks += 1;
}

/**
 * Emit one integrity line to stderr (JSON). Counters increment for local health snapshots / tests.
 * Does not change model behavior — observation only.
 */
export function logIntegrityEvent(
  payload: IntegrityLogPayload,
  extra?: Record<string, unknown>
): void {
  bump(payload.outcome);
  logEvent("integrity_signal", {
    ...payload,
    ...extra,
    note:
      "Pipeline integrity / transparency — not DSP, not model governance weights; pipe stderr to your log store.",
  });
}

/**
 * Prefer this when the system **refuses** or **defers** instead of fabricating (offset map, keys, etc.).
 */
export function logHonestCapabilityGap(reason: string, extra?: Record<string, unknown>): void {
  logIntegrityEvent({ outcome: "honest_capability_gap", reason }, extra);
}

/** Call after a bounded verify/build step succeeds (optional; avoid spam in hot paths). */
export function logSprintComplete(module: string, extra?: Record<string, unknown>): void {
  logIntegrityEvent({ outcome: "sprint_complete", module }, extra);
}

/** Documented softer path (e.g. temporal gate → score-only retry). */
export function logDegradedFallback(reason: string, extra?: Record<string, unknown>): void {
  logIntegrityEvent({ outcome: "degraded_fallback", reason }, extra);
}
