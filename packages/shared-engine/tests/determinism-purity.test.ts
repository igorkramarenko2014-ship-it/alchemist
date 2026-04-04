import { describe, it, expect } from "vitest";
import { computeShigorDecision } from "../operator/shigor-core";
import { ShigorDecisionContext } from "../operator/operator-types";
import { DEFAULT_OPERATOR_STATE } from "../operator/operator-resonance";

/**
 * AIOM v2: Byte-Stability & Determinism Test
 * 
 * This test ensures that the Pure Core produces byte-identical output 
 * for the same input, regardless of how many times it is run.
 * 
 * Requirement 4.1: Byte-identical serialization.
 */

describe("Pure Core Determinism & Byte-Stability", () => {
  const mockContext: ShigorDecisionContext = {
    operatorState: {
      ...DEFAULT_OPERATOR_STATE,
      resonanceState: {
        ...DEFAULT_OPERATOR_STATE.resonanceState,
        overload: 0.1,
        readiness: 0.9,
      },
      integrityFlags: {
        ...DEFAULT_OPERATOR_STATE.integrityFlags,
        consentLocked: true,
        executionGateOpen: true,
      }
    },
    oracleSignal: {
      leadPersona: "anton",
      depthLevel: 0.8,
      warmth: 0.7,
      readinessMatch: 0.8,
      truthDensity: 0.5,
      silenceAfter: false,
      deferTruth: false
    }
  };

  it("produces byte-identical JSON serialized output across 100 runs", () => {
    const outputs: string[] = [];
    
    for (let i = 0; i < 100; i++) {
      const result = computeShigorDecision(mockContext);
      // Canonical serialization (v2 path uses stable keys)
      const serialized = JSON.stringify(result);
      outputs.push(serialized);
    }

    const first = outputs[0];
    for (let i = 1; i < outputs.length; i++) {
      if (outputs[i] !== first) {
        console.error(`Determinism drift at iteration ${i}`);
        console.error(`Original: ${first}`);
        console.error(`Drifted:  ${outputs[i]}`);
      }
      expect(outputs[i]).toBe(first);
    }
  });

  it("handles complex inputs without logic drift", () => {
    // Ensuring that even with high fragility/epistemic gaps, the outcome is stable.
    const fragileContext: ShigorDecisionContext = {
      ...mockContext,
      operatorState: {
        ...mockContext.operatorState,
        resonanceState: { ...mockContext.operatorState.resonanceState, overload: 0.9, readiness: 0.1 },
        integrityFlags: { ...mockContext.operatorState.integrityFlags, epistemicBrake: true }
      }
    };

    const first = JSON.stringify(computeShigorDecision(fragileContext));
    for (let i = 0; i < 50; i++) {
      expect(JSON.stringify(computeShigorDecision(fragileContext))).toBe(first);
    }
  });
});
