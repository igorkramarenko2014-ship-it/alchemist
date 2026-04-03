import {
  clamp01,
  OperatorSignalInputs,
  OperatorState,
  TriadPersonaId,
  validateOperatorStateShape,
} from "./operator-types";
import { IHOR_ID, OperatorId, validateOperatorId } from "./operator-id";

const MAX_OPERATOR_SUMMARY_LENGTH = 180;

function normalizeSingleLine(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .replace(/[\r\n\t]+/g, " ")
    .trim();
}

function sanitizeOperatorSummary(value: string): string {
  const normalized = normalizeSingleLine(value);

  if (!normalized) {
    return "";
  }

  // Hard cap: diagnostic line only
  return normalized.slice(0, MAX_OPERATOR_SUMMARY_LENGTH);
}

function assertValidOperatorIdentity(state: OperatorState): void {
  validateOperatorId(state.operatorId);
}

function assertDiagnosticOnlyInvariants(state: OperatorState): void {
  if (state.authoritative !== false) {
    throw new Error("operator-state violation: authoritative must remain false");
  }

  if (state.diagnosticOnly !== true) {
    throw new Error("operator-state violation: diagnosticOnly must remain true");
  }
}

function assertNoNarrativeExpansion(state: OperatorState): void {
  const summary = state.notes.summary ?? "";

  if (summary.includes("\n") || summary.includes("\r")) {
    throw new Error("operator-state violation: notes.summary must remain single-line");
  }

  if (summary.length > MAX_OPERATOR_SUMMARY_LENGTH) {
    throw new Error(
      `operator-state violation: notes.summary exceeds ${MAX_OPERATOR_SUMMARY_LENGTH} chars`,
    );
  }
}

export function enforceOperatorWriteDiscipline(state: OperatorState): OperatorState {
  const disciplined: OperatorState = {
    ...state,
    authoritative: false,
    diagnosticOnly: true,
    notes: {
      ...state.notes,
      summary: sanitizeOperatorSummary(state.notes.summary ?? ""),
    },
  };

  assertValidOperatorIdentity(disciplined);
  assertDiagnosticOnlyInvariants(disciplined);
  assertNoNarrativeExpansion(disciplined);

  return disciplined;
}

export function createDefaultOperatorState(id: OperatorId): OperatorState {
  return {
    schemaVersion: 1,
    operatorId: id,
    updatedAtUtc: "1970-01-01T00:00:00.000Z",
    source: "manual_seed",
    authoritative: false,
    diagnosticOnly: true,

    missionState: {
      continuityScore: 1,
      missionClarity: 1,
      priorityIntegrity: 1,
      driftRisk: 0,
    },

    resonanceState: {
      readiness: 0.7,
      overload: 0.2,
      stability: 0.8,
      trustContinuity: 0.9,
      truthTolerance: 0.7,
      silenceTolerance: 0.7,
    },

    deliveryProfile: {
      preferredWarmth: 0.7,
      preferredDepth: 0.7,
      deferTruthBias: 0.4,
      pacingBias: 0.5,
      compressionPreference: 0.6,
    },

    triadInfluence: {
      svitlana: 0.34,
      anton: 0.33,
      elisey: 0.33,
      pythia: 0.5,
    },

    governorState: {
      truthDensity: 0.3,
      readinessMatch: 0.8,
      silenceAfterBias: 0.4,
      deferTruthActive: false,
      leadPersona: "svitlana",
    },

    integrityFlags: {
      humanPriorityOverride: false,
      epistemicBrake: false,
      executionGateOpen: true,
      consentLocked: true,
    },

    recentSignals: {
      dominantLogicIds: [],
      dominantFailureModes: [],
      activeSchisms: [],
    },

    notes: {
      summary: "",
      operatorConfirmed: false,
    },
  };
}

export const DEFAULT_OPERATOR_STATE = createDefaultOperatorState(IHOR_ID);

function normalizeLeadPersona(value: unknown): TriadPersonaId {
  return value === "anton" || value === "elisey" ? value : "svitlana";
}

export function mergeOperatorState(
  base: OperatorState,
  patch: OperatorSignalInputs,
  updatedAtUtc: string,
  source: OperatorState["source"] = "operator_resonance_pipeline",
): OperatorState {
  const next: OperatorState = {
    ...base,
    updatedAtUtc,
    source,

    missionState: {
      ...base.missionState,
      ...patch.missionState,
    },

    resonanceState: {
      ...base.resonanceState,
      ...patch.resonanceState,
    },

    deliveryProfile: {
      ...base.deliveryProfile,
      ...patch.deliveryProfile,
    },

    triadInfluence: {
      ...base.triadInfluence,
      ...patch.triadInfluence,
    },

    governorState: {
      ...base.governorState,
      ...patch.governorState,
      leadPersona: normalizeLeadPersona(
        patch.governorState?.leadPersona ?? base.governorState.leadPersona,
      ),
    },

    integrityFlags: {
      ...base.integrityFlags,
      ...patch.integrityFlags,
    },

    recentSignals: {
      ...base.recentSignals,
      ...patch.recentSignals,
      dominantLogicIds: patch.recentSignals?.dominantLogicIds ?? base.recentSignals.dominantLogicIds,
      dominantFailureModes:
        patch.recentSignals?.dominantFailureModes ?? base.recentSignals.dominantFailureModes,
      activeSchisms: patch.recentSignals?.activeSchisms ?? base.recentSignals.activeSchisms,
    },

    notes: {
      ...base.notes,
      ...patch.notes,
      summary: (patch.notes?.summary ?? base.notes.summary).slice(0, 180),
    },
  };

  next.missionState.continuityScore = clamp01(next.missionState.continuityScore);
  next.missionState.missionClarity = clamp01(next.missionState.missionClarity);
  next.missionState.priorityIntegrity = clamp01(next.missionState.priorityIntegrity);
  next.missionState.driftRisk = clamp01(next.missionState.driftRisk);

  next.resonanceState.readiness = clamp01(next.resonanceState.readiness);
  next.resonanceState.overload = clamp01(next.resonanceState.overload);
  next.resonanceState.stability = clamp01(next.resonanceState.stability);
  next.resonanceState.trustContinuity = clamp01(next.resonanceState.trustContinuity);
  next.resonanceState.truthTolerance = clamp01(next.resonanceState.truthTolerance);
  next.resonanceState.silenceTolerance = clamp01(next.resonanceState.silenceTolerance);

  next.deliveryProfile.preferredWarmth = clamp01(next.deliveryProfile.preferredWarmth);
  next.deliveryProfile.preferredDepth = clamp01(next.deliveryProfile.preferredDepth);
  next.deliveryProfile.deferTruthBias = clamp01(next.deliveryProfile.deferTruthBias);
  next.deliveryProfile.pacingBias = clamp01(next.deliveryProfile.pacingBias);
  next.deliveryProfile.compressionPreference = clamp01(next.deliveryProfile.compressionPreference);

  next.triadInfluence.svitlana = clamp01(next.triadInfluence.svitlana);
  next.triadInfluence.anton = clamp01(next.triadInfluence.anton);
  next.triadInfluence.elisey = clamp01(next.triadInfluence.elisey);
  next.triadInfluence.pythia = clamp01(next.triadInfluence.pythia);

  next.governorState.truthDensity = clamp01(next.governorState.truthDensity);
  next.governorState.readinessMatch = clamp01(next.governorState.readinessMatch);
  next.governorState.silenceAfterBias = clamp01(next.governorState.silenceAfterBias);

  validateOperatorStateShape(next);
  return enforceOperatorWriteDiscipline(next);
}

/** Derived resonance helpers */

export function computeMissionPressure(state: OperatorState): number {
  return clamp01(
    (1 - state.missionState.continuityScore) * 0.35 +
    state.missionState.driftRisk * 0.35 +
    (1 - state.missionState.priorityIntegrity) * 0.30,
  );
}

/**
 * Computes how fragile the current resonance is.
 * High fragility acts as a SAFETY BRAKE, dampening depth and increasing warmth.
 * 
 * Weights Logic:
 * - Overload (30%): Primary stress factor.
 * - Instability (25%): Structural integrity risk.
 * - Unreadiness (25%): Cognitive gap.
 * - Trust Continuity (20%): Here, low trust acts as a BREAK RISK (Mistrust increases fragility).
 */
export function computeResonanceFragility(state: OperatorState): number {
  // Trust works as a break risk (Mistrust increases fragility)
  return clamp01(
    state.resonanceState.overload * 0.30 +
    (1 - state.resonanceState.stability) * 0.25 +
    (1 - state.resonanceState.readiness) * 0.25 +
    (1 - state.resonanceState.trustContinuity) * 0.20,
  );
}

/**
 * Computes the maximum allowed 'depth of truth' for the current state.
 * 
 * Weights Logic:
 * - Truth Tolerance (35%): Direct human capacity signal.
 * - Readiness (25%): Real-time cognitive availability.
 * - Trust Continuity (20%): Here, trust acts as PERMISSION (High trust allows more depth).
 * - Inverse Overload (10%): Spare capacity bonus.
 * - Preferred Depth (10%): Minor operator bias (The Handwriting).
 */
export function computeTruthAllowance(state: OperatorState): number {
  // Trust works as permission (Trust increases allowance)
  return clamp01(
    state.resonanceState.truthTolerance * 0.35 +
    state.resonanceState.readiness * 0.25 +
    state.resonanceState.trustContinuity * 0.20 +
    (1 - state.resonanceState.overload) * 0.10 +
    state.deliveryProfile.preferredDepth * 0.10,
  );
}
