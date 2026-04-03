import { OperatorId } from "./operator-id";

export type TriadPersonaId = "svitlana" | "anton" | "elisey";
export type GovernorId = "pythia";

export type SourceKind =
  | "operator_resonance_pipeline"
  | "manual_seed"
  | "test_fixture"
  | "iom_snapshot";

export type PulseSeverity = "none" | "warn" | "critical";

export interface PulseCorrectionInput {
  criticalCodes: string[];
  warningCodes: string[];

  hasIntegrityBreach: boolean;
  hasPipelineFailure: boolean;
  hasResonanceLoss: boolean;
  hasStabilityDrift: boolean;

  pipelineSeverity: PulseSeverity;
  resonanceSeverity: PulseSeverity;
  stabilitySeverity: PulseSeverity;
  integritySeverity: PulseSeverity;

  /** Convenience flag for diagnostics and tests. */
  activeSafeMode: boolean;
}

export interface MissionState {
  /** How well the core mission is being preserved across the current window. */
  continuityScore: number; // 0..1

  /** How legible the current mission is to the system. */
  missionClarity: number; // 0..1

  /** Whether priorities remain ordered correctly. */
  priorityIntegrity: number; // 0..1

  /** Risk that the system is drifting away from mission. */
  driftRisk: number; // 0..1
}

export interface ResonanceState {
  /** Readiness to receive the next layer of truth / action. */
  readiness: number; // 0..1

  /** Cognitive / emotional / operational overload estimate. */
  overload: number; // 0..1

  /** Short-window system/operator stability estimate. */
  stability: number; // 0..1

  /** Whether trust continuity is intact. */
  trustContinuity: number; // 0..1

  /** Maximum safe truth density before ego-burn risk rises. */
  truthTolerance: number; // 0..1

  /** Whether silence can be used as a delivery primitive. */
  silenceTolerance: number; // 0..1
}

export interface DeliveryProfile {
  /** Preferred warmth of delivery form. */
  preferredWarmth: number; // 0..1

  /** Preferred depth of content delivery. */
  preferredDepth: number; // 0..1

  /** Tendency to defer truth when readiness is weak. */
  deferTruthBias: number; // 0..1

  /** Preferred pacing from slow/reflective to fast/direct. */
  pacingBias: number; // 0..1

  /** Preference for compressed vs expanded delivery. */
  compressionPreference: number; // 0..1
}

export interface TriadInfluence {
  svitlana: number; // 0..1
  anton: number; // 0..1
  elisey: number; // 0..1
  pythia: number; // 0..1
}

export interface GovernorState {
  /** depthLevel * epistemicGapScore, normalized to 0..1 */
  truthDensity: number; // 0..1

  /** How well current delivery matches current operator readiness. */
  readinessMatch: number; // 0..1

  /** Probability-like bias to stop after a dense truthful signal. */
  silenceAfterBias: number; // 0..1

  /** Whether truth should be deferred rather than delivered now. */
  deferTruthActive: boolean;

  /**
   * Who should lead the content layer right now.
   * Pythia is governor only and must not appear here.
   */
  leadPersona: TriadPersonaId;
}

export interface IntegrityFlags {
  humanPriorityOverride: boolean;
  epistemicBrake: boolean;
  executionGateOpen: boolean;
  consentLocked: boolean;
}

export interface RecentSignals {
  dominantLogicIds: string[];
  dominantFailureModes: string[];
  activeSchisms: string[];
}

export interface OperatorNotes {
  /**
   * Max one short diagnostic line.
   * Must never become autobiographical memory.
   */
  summary: string;

  /**
   * Explicit operator confirmation, if ever wired later.
   * Safe default: false.
   */
  operatorConfirmed: boolean;
}

export interface OperatorState {
  schemaVersion: 1;
  operatorId: OperatorId;
  updatedAtUtc: string;
  source: SourceKind;

  /** Must remain false; this file is diagnostic, not truth-law. */
  authoritative: false;

  /** Must remain true; never narrative memory. */
  diagnosticOnly: true;

  missionState: MissionState;
  resonanceState: ResonanceState;
  deliveryProfile: DeliveryProfile;
  triadInfluence: TriadInfluence;
  governorState: GovernorState;
  integrityFlags: IntegrityFlags;
  recentSignals: RecentSignals;
  notes: OperatorNotes;
}

export interface OperatorSignalInputs {
  missionState?: Partial<MissionState>;
  resonanceState?: Partial<ResonanceState>;
  deliveryProfile?: Partial<DeliveryProfile>;
  triadInfluence?: Partial<TriadInfluence>;
  governorState?: Partial<GovernorState>;
  integrityFlags?: Partial<IntegrityFlags>;
  recentSignals?: Partial<RecentSignals>;
  notes?: Partial<OperatorNotes>;
}

export interface OracleSignal {
  leadPersona: TriadPersonaId;
  depthLevel: number; // 0..1
  warmth: number; // 0..1
  readinessMatch: number; // 0..1
  truthDensity: number; // 0..1
  silenceAfter: boolean;
  deferTruth: boolean;
}

export interface TriadSnapshotLike {
  stabilityScore?: number;
  logicEntropy?: number;
  epistemicGapScore?: number;
  activeSchisms?: string[];
}

export interface ShigorDecisionContext {
  operatorState: OperatorState;
  oracleSignal?: OracleSignal;
  triadSnapshot?: TriadSnapshotLike;
  pulseCorrection?: PulseCorrectionInput;
}

export interface ShigorDecision {
  leadPersona: TriadPersonaId;
  depthLevel: number; // 0..1
  pacing: number; // 0..1
  warmth: number; // 0..1
  deferTruth: boolean;
  silenceAfter: boolean;
  blockDestructiveActions: boolean;
  integrityFlags: IntegrityFlags;
  rationaleCodes: string[];
}

/** Utility guards */

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

export function isTriadPersonaId(value: string): value is TriadPersonaId {
  return value === "svitlana" || value === "anton" || value === "elisey";
}

import { validateOperatorId } from "./operator-id";

export function assertOperatorId(value: string): asserts value is OperatorId {
  validateOperatorId(value);
}

export function validateOperatorStateShape(state: OperatorState): void {
  assertOperatorId(state.operatorId);

  if (state.schemaVersion !== 1) {
    throw new Error(`Unsupported schemaVersion: ${state.schemaVersion}`);
  }

  if (state.authoritative !== false) {
    throw new Error("operator-state must remain authoritative=false");
  }

  if (state.diagnosticOnly !== true) {
    throw new Error("operator-state must remain diagnosticOnly=true");
  }

  if (!isTriadPersonaId(state.governorState.leadPersona)) {
    throw new Error(`Invalid leadPersona: ${state.governorState.leadPersona}`);
  }
}
