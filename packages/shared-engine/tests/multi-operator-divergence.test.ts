import { describe, it, expect, beforeAll } from "vitest";
import { 
  normalizeOperatorId, 
  validateOperatorId,
  IHOR_ID,
  CLARA_ID 
} from "../operator/operator-id";
import { 
  createDefaultOperatorState, 
  mergeOperatorState 
} from "../operator/operator-resonance";
import { computeShigorDecision } from "../operator/shigor-core";
import { ShigorDecisionContext, OracleSignal } from "../operator/operator-types";

describe("multi-operator-divergence", () => {
  it("1. Identity Validation: Only strict IDs are allowed", () => {
    expect(() => validateOperatorId("ihor")).not.toThrow();
    expect(() => validateOperatorId("clara")).not.toThrow();
    expect(() => validateOperatorId("id with space")).toThrow();
    expect(() => validateOperatorId("../evil")).toThrow();
    expect(() => validateOperatorId("UPPERCASE")).toThrow(); // Regex is [a-z0-9_-]
  });

  it("2. Normalization: Standardizes input", () => {
    expect(normalizeOperatorId(" Ihor ")).toBe("ihor");
  });

  it("3. Divergence: Ihor (Normal) vs Clara (Overloaded) given same signals", () => {
    const oracle: OracleSignal = {
      leadPersona: "anton",
      depthLevel: 0.8,
      warmth: 0.5,
      readinessMatch: 0.8,
      truthDensity: 0.7,
      silenceAfter: false,
      deferTruth: false
    };

    const ihorState = createDefaultOperatorState(IHOR_ID);
    // Clara is heavily overloaded, unstable and very truth-sensitive
    let claraState = createDefaultOperatorState(CLARA_ID);
    claraState = mergeOperatorState(claraState, {
      resonanceState: { overload: 0.9, stability: 0.1, readiness: 0.1, truthTolerance: 0.1 }
    }, new Date().toISOString(), "test_fixture");

    const ihorCtx: ShigorDecisionContext = { operatorState: ihorState, oracleSignal: oracle };
    const claraCtx: ShigorDecisionContext = { operatorState: claraState, oracleSignal: oracle };

    const ihorDecision = computeShigorDecision(ihorCtx);
    const claraDecision = computeShigorDecision(claraCtx);

    // Ihor should stay with Anton (as requested by Oracle, since Ihor is stable)
    expect(ihorDecision.leadPersona).toBe("anton");

    // Clara is unstable/overloaded, should lean towards Svitlana or deferTruth
    // and definitely have lower pacing.
    expect(claraDecision.pacing).toBeLessThan(ihorDecision.pacing);
    expect(claraDecision.deferTruth).toBe(true); // Due to fragility vs depth
    
    // Most importantly, their decisions are DIFFERENT
    expect(ihorDecision).not.toEqual(claraDecision);
  });

  it("4. Isolation: Clara state mutation doesn't bleed to Ihor factory", () => {
    const claraState = createDefaultOperatorState(CLARA_ID);
    claraState.resonanceState.overload = 1.0;

    const ihorState = createDefaultOperatorState(IHOR_ID);
    expect(ihorState.resonanceState.overload).toBe(0.2); // Original default
    expect(ihorState.operatorId).toBe(IHOR_ID);
  });
});
