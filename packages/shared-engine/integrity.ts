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
import { PANELIST_WEIGHTS } from "./constants";

/** High-level influence status types (centralized in integrity.ts). */
export interface PriorsStatus {
  active: boolean;
  learningContext: boolean;
  corpusPrior: boolean;
  tastePrior: boolean;
  confidence: "low" | "medium" | "high";
  stalenessDays: number | null;
}

export interface LearningStatus {
  status: "active" | "inactive" | "error";
  confidence: "low" | "medium" | "high";
  sampleCount: number;
}

export interface InfluenceAjiStatus {
  active: boolean;
  expiresAtUtc: string | null;
}

export interface InfluenceTriadMode {
  mode: "fetcher" | "partial" | "stub" | "tablebase";
}

export interface InfluenceStatus {
  priorsStatus: PriorsStatus | null;
  learningStatus: LearningStatus | null;
  ajiStatus: InfluenceAjiStatus | null;
  triadMode: InfluenceTriadMode | null;
  /** Phase 2.1: Behavioral footprint summary. Multi-persona since Phase 3.4. */
  personaStatus: any[]; // Avoid circular dependency with persona-influence
}

/** 
 * Canonical Integrity Lock Model (Locks 1-5).
 * Order: Consent -> Execution Gate -> Epistemic Brake -> Human/Harm -> Decision
 */
export type IntegrityLockId = "consent" | "execution" | "brake" | "human" | "harm";

export type IntegrityLockReason = 
  | "CONSENT_LACKING"
  | "EXECUTION_GATE_CLOSED"
  | "EPISTEMIC_BRAKE_ACTIVE"
  | "HUMAN_PRIORITY_OVERRIDE"
  | "HARM_GATE_TRIPPED";

export interface IntegrityLockStatus {
  id: IntegrityLockId;
  active: boolean;
  reason?: IntegrityLockReason;
}


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
  influence: InfluenceStatus;
  locks: IntegrityLockStatus[];
}

export function getIntegrityHealthSnapshot(): IntegrityHealthSnapshot {
  return {
    honestCapabilityGaps: honestGaps,
    sprintCompletions: sprintOks,
    degradedFallbacks,
    coreModel: getCoreModelState(),
    influence: getInfluenceSnapshot(),
    locks: evaluateIntegrityLocks(),
  };
}

/**
 * Calculates current influence status from environment and in-memory state.
 * Source of truth for web route and CLI dashboards.
 */
export function getInfluenceSnapshot(): InfluenceStatus {
  const env = (typeof process !== "undefined" ? process.env : {}) as Record<string, string | undefined>;
  
  const learningContext = env.ALCHEMIST_LEARNING_CONTEXT === "1";
  const corpusPrior = env.ALCHEMIST_CORPUS_PRIOR === "1";
  const tastePrior = env.ALCHEMIST_TASTE_PRIOR === "1";
  const active = learningContext || corpusPrior || tastePrior;

  // These would ideally come from the loaded index metadata in a real run
  const priorsStatus: PriorsStatus = {
    active,
    learningContext,
    corpusPrior,
    tastePrior,
    confidence: "medium", // Default heuristic when index not directly accessible here
    stalenessDays: null,
  };

  const learningStatus: LearningStatus = {
    status: active ? "active" : "inactive",
    confidence: "medium",
    sampleCount: 0,
  };

  return {
    priorsStatus,
    learningStatus,
    ajiStatus: {
      active: env.ALCHEMIST_AJI_ACTIVE === "1",
      expiresAtUtc: env.ALCHEMIST_AJI_EXPIRES_AT ?? null,
    },
    triadMode: {
      mode: env.ALCHEMIST_TRIAD_MODE === "fetcher" ? "fetcher" : "stub",
    },
    personaStatus: [], // To be populated by persona logic if needed
  };
}

/**
 * Deterministic ordered evaluation of Integrity Locks (1-5).
 * Requirement A: Fixed precedence.
 */
export function evaluateIntegrityLocks(): IntegrityLockStatus[] {
  const env = (typeof process !== "undefined" ? process.env : {}) as Record<string, string | undefined>;
  const locks: IntegrityLockStatus[] = [];

  // 1. Consent (Lock 1)
  const consentLocked = env.ALCHEMIST_CONSENT_LOCKED !== "0"; // Default to locked (safe)
  locks.push({
    id: "consent",
    active: !consentLocked,
    reason: !consentLocked ? "CONSENT_LACKING" : undefined,
  });

  // 2. Execution Gate (Lock 2)
  const executionGateOpen = env.ALCHEMIST_EXECUTION_GATE !== "0"; // Default to open
  locks.push({
    id: "execution",
    active: !executionGateOpen,
    reason: !executionGateOpen ? "EXECUTION_GATE_CLOSED" : undefined,
  });

  // 3. Epistemic Brake (Lock 3)
  const epistemicBrake = env.ALCHEMIST_EPISTEMIC_BRAKE === "1";
  locks.push({
    id: "brake",
    active: epistemicBrake,
    reason: epistemicBrake ? "EPISTEMIC_BRAKE_ACTIVE" : undefined,
  });

  // 4. Human Priority / Harm Gate (Lock 4/5 Combined)
  const humanPriority = env.ALCHEMIST_HUMAN_PRIORITY === "1";
  const harmGate = env.ALCHEMIST_HARM_GATE === "1";
  
  if (humanPriority) {
    locks.push({
      id: "human",
      active: true,
      reason: "HUMAN_PRIORITY_OVERRIDE",
    });
  } else if (harmGate) {
    locks.push({
      id: "harm",
      active: true,
      reason: "HARM_GATE_TRIPPED",
    });
  } else {
    locks.push({ id: "human", active: false });
  }

  return locks;
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
