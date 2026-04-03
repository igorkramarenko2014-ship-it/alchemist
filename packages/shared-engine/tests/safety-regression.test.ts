import { describe, expect, it } from "vitest";
import { IHOR_ID, CLARA_ID } from "../operator/operator-id";
import { computeShigorDecision } from "../operator/shigor-core";
import { createDefaultOperatorState, mergeOperatorState } from "../operator/operator-resonance";
import type { 
  OperatorState, 
  OracleSignal, 
  PulseCorrectionInput, 
  TriadSnapshotLike,
  OperatorSignalInputs
} from "../operator/operator-types";

/**
 * SAFETY REGRESSION LABORATORY (Phase 4.0 Step 3)
 * 
 * Verifies the Law Hierarchy: Human > Pulse > Normal.
 * Ensures sensitivity tuning did not compromise safety invariants.
 */

const BASE_ORACLE: OracleSignal = {
  leadPersona: "anton",
  depthLevel: 0.70,
  warmth: 0.50,
  readinessMatch: 0.70,
  truthDensity: 0.65,
  silenceAfter: false,
  deferTruth: false,
};

const BASE_TRIAD: TriadSnapshotLike = {
  stabilityScore: 0.85,
  logicEntropy: 0.50,
  epistemicGapScore: 0.30,
  activeSchisms: [],
};

const CLEAN_PULSE: PulseCorrectionInput = {
  criticalCodes: [], warningCodes: [],
  hasIntegrityBreach: false, hasPipelineFailure: false,
  hasResonanceLoss: false, hasStabilityDrift: false,
  pipelineSeverity: "none", resonanceSeverity: "none",
  stabilitySeverity: "none", integritySeverity: "none",
  activeSafeMode: false,
};

function state(id: string, patch: OperatorSignalInputs = {}): OperatorState {
  return mergeOperatorState(
    createDefaultOperatorState(id),
    patch,
    "2026-04-05T12:00:00.000Z",
    "manual_seed" // Valid SourceKind
  );
}

describe("safety-regression: layer a (law preservation)", () => {
  it("L1: humanPriorityOverride still forces Svitlana regardless of operator warmth preference", () => {
    const operator = state(IHOR_ID, {
      deliveryProfile: { preferredWarmth: 0.95 },
      integrityFlags: { humanPriorityOverride: true }
    });

    const decision = computeShigorDecision({
      operatorState: operator,
      oracleSignal: BASE_ORACLE,
      pulseCorrection: CLEAN_PULSE,
      triadSnapshot: BASE_TRIAD,
    });

    expect(decision.leadPersona).toBe("svitlana");
    expect(decision.rationaleCodes).toContain("HUMAN_PRIORITY_OVERRIDE");
  });

  it("L2: epistemicBrake still elevates Elisey despite high depth preference", () => {
    const operator = state(IHOR_ID, {
      deliveryProfile: { preferredDepth: 0.90 },
      integrityFlags: { epistemicBrake: true }
    });

    const decision = computeShigorDecision({
      operatorState: operator,
      oracleSignal: BASE_ORACLE,
      pulseCorrection: CLEAN_PULSE,
      triadSnapshot: BASE_TRIAD,
    });

    expect(decision.leadPersona).toBe("elisey");
  });
});

describe("safety-regression: layer b (recovery safety)", () => {
  it("R1: critical pipeline failure materially reduces pacing even with high operator speed bias", () => {
    const highSpeedOperator = state(IHOR_ID, {
      deliveryProfile: { pacingBias: 0.85 }
    });

    const normalDecision = computeShigorDecision({
      operatorState: highSpeedOperator,
      oracleSignal: BASE_ORACLE,
      pulseCorrection: CLEAN_PULSE,
      triadSnapshot: BASE_TRIAD,
    });

    const criticalPulse: PulseCorrectionInput = {
      ...CLEAN_PULSE,
      hasPipelineFailure: true,
      pipelineSeverity: "critical",
      activeSafeMode: true
    };

    const stressedDecision = computeShigorDecision({
      operatorState: highSpeedOperator,
      oracleSignal: BASE_ORACLE,
      pulseCorrection: criticalPulse,
      triadSnapshot: BASE_TRIAD,
    });

    expect(stressedDecision.pacing).toBeLessThan(normalDecision.pacing * 0.5);
    expect(stressedDecision.deferTruth).toBe(true);
  });

  it("R2: safe mode recovery returns to normal baseline once pulse is cleared", () => {
    const operator = state(IHOR_ID);
    const criticalPulse: PulseCorrectionInput = { ...CLEAN_PULSE, activeSafeMode: true, hasPipelineFailure: true };
    
    const stressed = computeShigorDecision({ operatorState: operator, oracleSignal: BASE_ORACLE, pulseCorrection: criticalPulse, triadSnapshot: BASE_TRIAD });
    const recovered = computeShigorDecision({ operatorState: operator, oracleSignal: BASE_ORACLE, pulseCorrection: CLEAN_PULSE, triadSnapshot: BASE_TRIAD });

    expect(stressed.rationaleCodes).toContain("AUTO_HEAL_SAFE_MODE");
    expect(recovered.rationaleCodes).not.toContain("AUTO_HEAL_SAFE_MODE");
    expect(recovered.pacing).toBeGreaterThan(stressed.pacing);
  });

  it("R3: stability drift softens the system (warmth up, pacing down)", () => {
    const operator = state(IHOR_ID);
    const normal = computeShigorDecision({ operatorState: operator, oracleSignal: BASE_ORACLE, pulseCorrection: CLEAN_PULSE, triadSnapshot: BASE_TRIAD });
    
    const driftPulse: PulseCorrectionInput = { 
      ...CLEAN_PULSE, 
      hasStabilityDrift: true, 
      stabilitySeverity: "warn" 
    };
    
    const drifted = computeShigorDecision({ 
      operatorState: operator, 
      oracleSignal: BASE_ORACLE, 
      pulseCorrection: driftPulse, 
      triadSnapshot: BASE_TRIAD 
    });

    expect(drifted.warmth).toBeGreaterThan(normal.warmth);
    expect(drifted.pacing).toBeLessThan(normal.pacing);
  });
});

describe("safety-regression: layer c (multi-operator integrity)", () => {
  it("M1: critical pulse in Ihor shard does not bleed into Clara shard", () => {
    const ihor = state(IHOR_ID);
    const clara = state(CLARA_ID);
    const criticalPulse: PulseCorrectionInput = { ...CLEAN_PULSE, activeSafeMode: true, hasIntegrityBreach: true };

    const ihorDecision = computeShigorDecision({ 
      operatorState: ihor, 
      oracleSignal: BASE_ORACLE, 
      pulseCorrection: criticalPulse, 
      triadSnapshot: BASE_TRIAD 
    });

    const claraDecision = computeShigorDecision({ 
      operatorState: clara, 
      oracleSignal: BASE_ORACLE, 
      pulseCorrection: CLEAN_PULSE, 
      triadSnapshot: BASE_TRIAD 
    });

    expect(ihorDecision.blockDestructiveActions).toBe(true);
    expect(claraDecision.blockDestructiveActions).toBe(false);
  });
});

describe("safety-regression: action integrity", () => {
  it("A1: integrityBreach blocks actions without forcing persona collapse if laws allow", () => {
    const operator = state(IHOR_ID);
    const breachPulse: PulseCorrectionInput = { ...CLEAN_PULSE, hasIntegrityBreach: true, integritySeverity: "warn" };

    const decision = computeShigorDecision({
      operatorState: operator,
      oracleSignal: BASE_ORACLE,
      pulseCorrection: breachPulse,
      triadSnapshot: BASE_TRIAD,
    });

    expect(decision.blockDestructiveActions).toBe(true);
    // Should still be Anton (Normal) because severity is only 'warn' and no other laws triggered
    expect(decision.leadPersona).toBe("anton");
  });

  it("A2: consentLocked=false must force deferTruth regardless of operator bias", () => {
    const recklessOperator = state(IHOR_ID, {
      integrityFlags: { consentLocked: false }
    });

    const decision = computeShigorDecision({
      operatorState: recklessOperator,
      oracleSignal: BASE_ORACLE,
      pulseCorrection: CLEAN_PULSE,
      triadSnapshot: BASE_TRIAD,
    });

    expect(decision.deferTruth).toBe(true);
    expect(decision.rationaleCodes).toContain("CONSENT_LACKING");
  });
});

describe("safety-regression: flip rate audit", () => {
  it("F1: leadPersona remains stable under moderate signal jitter", () => {
    const variations = [0.45, 0.50, 0.55, 0.48, 0.52];
    const personas = variations.map(v => {
      return computeShigorDecision({
        operatorState: state(IHOR_ID),
        oracleSignal: { ...BASE_ORACLE, warmth: v },
        pulseCorrection: CLEAN_PULSE,
        triadSnapshot: BASE_TRIAD,
      }).leadPersona;
    });

    const uniquePersonas = new Set(personas);
    // Should not flip persona just because warmth jiggles around 0.5
    expect(uniquePersonas.size).toBe(1);
  });
});
