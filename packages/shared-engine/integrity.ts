/**
 * System integrity signals — auditable JSON lines (same transport as `telemetry.ts`).
 * This tracks **pipeline** honesty and completion, not model “loyalty” or hidden scores.
 *
 * Use when the engine takes a documented fallback or explicitly refuses work (capability gap).
 */
import type { CoreModelState, DegradationLevel } from "@alchemist/shared-types";
import {
  GENERATOR_DECIMAL,
  getOutputDigit,
  hasDualResonance,
  isHumanReadable,
  nextState,
  Z_PRIME,
} from "./core-model";
import { logEvent } from "./telemetry";

/** High-level outcome for dashboards / SOE-style aggregates (transparent, not shadow governance). */
export type IntegrityOutcome =
  | "honest_capability_gap"
  | "sprint_complete"
  | "degraded_fallback"
  | "core_model_degrade";

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

// Cyclic Integrity State (Z*29)
let currentCoreLevel: DegradationLevel = "FULL";
let currentCoreState: number = 1;

/** Test isolation — resets in-memory counters and core model state. */
export function resetIntegrityMetricsForTests(): void {
  honestGaps = 0;
  sprintOks = 0;
  degradedFallbacks = 0;
  currentCoreLevel = "FULL";
  currentCoreState = 1;
}

export interface IntegrityHealthSnapshot {
  honestCapabilityGaps: number;
  sprintCompletions: number;
  degradedFallbacks: number;
  coreModel: CoreModelState;
}

export function getIntegrityHealthSnapshot(): IntegrityHealthSnapshot {
  return {
    honestCapabilityGaps: honestGaps,
    sprintCompletions: sprintOks,
    degradedFallbacks,
    coreModel: getCoreModelState(),
  };
}

export function getCoreModelState(): CoreModelState {
  return {
    level: currentCoreLevel,
    state: currentCoreState,
    resonance: hasDualResonance(currentCoreLevel) ? 1.0 : 0.0,
    humanReadable: isHumanReadable(currentCoreLevel),
    digit: getOutputDigit(currentCoreState),
  };
}

/**
 * Triggers a state transition using the Interpretation (Decimal) engine.
 * Only possible in FULL mode.
 */
export function tickCoreModel(): void {
  if (currentCoreLevel === "FULL") {
    currentCoreState = nextState(currentCoreState, GENERATOR_DECIMAL);
  }
}

/**
 * Manually degrade the core model state space.
 * Recovery requires administrative action (reset/restore).
 */
export function degradeCoreModel(target: DegradationLevel, reason: string): void {
  const previous = currentCoreLevel;
  currentCoreLevel = target;
  logIntegrityEvent(
    { outcome: "core_model_degrade", reason },
    { previous, target, state: currentCoreState },
  );
}

function bump(outcome: IntegrityOutcome): void {
  if (outcome === "honest_capability_gap") honestGaps += 1;
  else if (outcome === "sprint_complete") sprintOks += 1;
  else if (outcome === "degraded_fallback") degradedFallbacks += 1;
  else if (outcome === "core_model_degrade") {
    // track metrics if needed
  }
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
