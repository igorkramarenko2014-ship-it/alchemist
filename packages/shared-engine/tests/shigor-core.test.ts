import { describe, it, expect } from "vitest";
import { 
  ShigorDecisionContext, 
  OperatorState 
} from "../operator/operator-types";
import { DEFAULT_OPERATOR_STATE } from "../operator/operator-resonance";
import { computeShigorDecision } from "../operator/shigor-core";

describe("Shigor Core Decision Engine (Phase 3.7)", () => {
  const createMockContext = (patch: Partial<OperatorState> = {}, oracleLead?: any): ShigorDecisionContext => ({
    operatorState: {
      ...DEFAULT_OPERATOR_STATE,
      integrityFlags: { ...DEFAULT_OPERATOR_STATE.integrityFlags, ...patch.integrityFlags },
      resonanceState: { ...DEFAULT_OPERATOR_STATE.resonanceState, ...patch.resonanceState },
      governorState: { ...DEFAULT_OPERATOR_STATE.governorState, ...patch.governorState },
      ...patch,
    },
    oracleSignal: oracleLead ? {
      leadPersona: oracleLead,
      depthLevel: 0.8,
      warmth: 0.8,
      readinessMatch: 0.8,
      truthDensity: 0.5,
      silenceAfter: true,
      deferTruth: false
    } : undefined
  });

  it("L03: humanPriorityOverride should ensure Svitlana always wins lead", () => {
    const ctx = createMockContext({
      integrityFlags: { humanPriorityOverride: true, epistemicBrake: false, executionGateOpen: true, consentLocked: true }
    }, "anton");
    
    const decision = computeShigorDecision(ctx);
    expect(decision.leadPersona).toBe("svitlana");
    expect(decision.rationaleCodes).toContain("HUMAN_PRIORITY_OVERRIDE");
  });

  it("L05: epistemicBrake should ensure Elisey beats oracle lead", () => {
    const ctx = createMockContext({
      integrityFlags: { humanPriorityOverride: false, epistemicBrake: true, executionGateOpen: true, consentLocked: true }
    }, "anton");

    const decision = computeShigorDecision(ctx);
    expect(decision.leadPersona).toBe("elisey");
    expect(decision.rationaleCodes).toContain("EPISTEMIC_BRAKE");
  });

  it("L09: consentLocked=false should trigger deferTruth=true", () => {
    const ctx = createMockContext({
      integrityFlags: { humanPriorityOverride: false, epistemicBrake: false, executionGateOpen: true, consentLocked: false }
    }, "svitlana");

    const decision = computeShigorDecision(ctx);
    expect(decision.deferTruth).toBe(true);
  });

  it("Heuristic: truthDensity high + silenceTolerance high should trigger silenceAfter=true", () => {
    const ctx = createMockContext({
      governorState: { truthDensity: 0.9, leadPersona: "svitlana", readinessMatch: 0.9, silenceAfterBias: 0.9, deferTruthActive: false },
      resonanceState: { silenceTolerance: 0.9, readiness: 0.9, overload: 0.1, stability: 0.9, trustContinuity: 0.9, truthTolerance: 0.9 }
    }, "svitlana");

    const decision = computeShigorDecision(ctx);
    expect(decision.silenceAfter).toBe(true);
    expect(decision.rationaleCodes).toContain("SILENCE_AFTER");
  });

  it("Guardrail: overload high + readiness low should trigger deferTruth=true", () => {
    const ctx = createMockContext({
      resonanceState: { readiness: 0.1, overload: 0.9, stability: 0.2, trustContinuity: 0.5, truthTolerance: 0.5, silenceTolerance: 0.5 }
    }, "elisey");

    const decision = computeShigorDecision(ctx);
    expect(decision.deferTruth).toBe(true);
    expect(decision.rationaleCodes).toContain("DEFER_TRUTH");
  });

  it("Advisory: Lead Anton from Oracle should win if no brakes active", () => {
    const ctx = createMockContext({
      integrityFlags: { humanPriorityOverride: false, epistemicBrake: false, executionGateOpen: true, consentLocked: true }
    }, "anton");

    const decision = computeShigorDecision(ctx);
    expect(decision.leadPersona).toBe("anton");
  });

  it("L04: executionGateOpen=false should force lead back to Svitlana (Calibration)", () => {
    const ctx = createMockContext({
      integrityFlags: { humanPriorityOverride: false, epistemicBrake: false, executionGateOpen: false, consentLocked: true }
    }, "anton");

    const decision = computeShigorDecision(ctx);
    expect(decision.leadPersona).toBe("svitlana");
    expect(decision.rationaleCodes).toContain("EXECUTION_GATE_CLOSED");
  });
});
