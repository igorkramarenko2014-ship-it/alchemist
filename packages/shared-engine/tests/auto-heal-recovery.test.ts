import { describe, it, expect } from "vitest";
import { 
  ShigorDecisionContext, 
  PulseCorrectionInput,
  OperatorState,
  TriadPersonaId
} from "../operator/operator-types";
import { DEFAULT_OPERATOR_STATE, mergeOperatorState } from "../operator/operator-resonance";
import { computeShigorDecision } from "../operator/shigor-core";

describe("auto-heal-recovery", () => {
  const s = (patch: any) => mergeOperatorState(DEFAULT_OPERATOR_STATE, patch, new Date().toISOString(), "test_fixture");

  function createPulse(patch: Partial<PulseCorrectionInput> = {}): PulseCorrectionInput {
    return {
      criticalCodes: [],
      warningCodes: [],
      hasIntegrityBreach: false,
      hasPipelineFailure: false,
      hasResonanceLoss: false,
      hasStabilityDrift: false,
      pipelineSeverity: "none",
      resonanceSeverity: "none",
      stabilitySeverity: "none",
      integritySeverity: "none",
      activeSafeMode: false,
      ...patch
    };
  }

  it("1. Precedence: humanPriorityOverride must still win over pipeline failure", () => {
    const ctx: ShigorDecisionContext = {
      operatorState: s({ integrityFlags: { humanPriorityOverride: true } }),
      pulseCorrection: createPulse({ hasPipelineFailure: true, pipelineSeverity: "critical", activeSafeMode: true }),
      oracleSignal: { leadPersona: "anton", depthLevel: 0.5, warmth: 0.5, readinessMatch: 0.5, truthDensity: 0.5, silenceAfter: false, deferTruth: false }
    };

    const decision = computeShigorDecision(ctx);
    // Human > Pulse
    expect(decision.leadPersona).toBe("svitlana");
    expect(decision.rationaleCodes).toContain("HUMAN_PRIORITY_OVERRIDE");
    expect(decision.rationaleCodes).toContain("PIPELINE_STRESS_GUARD");
  });

  it("2. L18 Pipeline Stress: Svitalna bias and deferTruth", () => {
    const ctx: ShigorDecisionContext = {
      operatorState: s({}),
      pulseCorrection: createPulse({ hasPipelineFailure: true, pipelineSeverity: "critical", activeSafeMode: true }),
      oracleSignal: { leadPersona: "anton", depthLevel: 0.6, warmth: 0.5, readinessMatch: 0.5, truthDensity: 0.5, silenceAfter: false, deferTruth: false }
    };

    const decision = computeShigorDecision(ctx);
    expect(decision.leadPersona).toBe("svitlana");
    expect(decision.deferTruth).toBe(true);
    expect(decision.rationaleCodes).toContain("PIPELINE_STRESS_GUARD");
  });

  it("3. L19 Resonance Loss: Elisey bias and deferTruth", () => {
    const ctx: ShigorDecisionContext = {
      operatorState: s({}),
      pulseCorrection: createPulse({ hasResonanceLoss: true, resonanceSeverity: "critical", activeSafeMode: true }),
      oracleSignal: { leadPersona: "anton", depthLevel: 0.5, warmth: 0.5, readinessMatch: 0.5, truthDensity: 0.5, silenceAfter: false, deferTruth: false }
    };

    const decision = computeShigorDecision(ctx);
    expect(decision.leadPersona).toBe("elisey");
    expect(decision.deferTruth).toBe(true);
    expect(decision.rationaleCodes).toContain("RESONANCE_RECOVERY_MODE");
  });

  it("4. L20 Stability Drift: Pacing reduction and warmth boost", () => {
    const normalCtx: ShigorDecisionContext = { operatorState: s({}), oracleSignal: { leadPersona: "anton", depthLevel: 0.5, warmth: 0.5, readinessMatch: 0.5, truthDensity: 0.5, silenceAfter: false, deferTruth: false } };
    const normalDecision = computeShigorDecision(normalCtx);

    const driftCtx: ShigorDecisionContext = {
      operatorState: s({}),
      pulseCorrection: createPulse({ hasStabilityDrift: true, stabilitySeverity: "warn", activeSafeMode: true }),
      oracleSignal: { leadPersona: "anton", depthLevel: 0.5, warmth: 0.5, readinessMatch: 0.5, truthDensity: 0.5, silenceAfter: false, deferTruth: false }
    };

    const driftDecision = computeShigorDecision(driftCtx);
    expect(driftDecision.pacing).toBeLessThan(normalDecision.pacing);
    expect(driftDecision.warmth).toBeGreaterThan(normalDecision.warmth);
    expect(driftDecision.rationaleCodes).toContain("STABILITY_REBALANCE");
  });

  it("5. L21 Integrity Breach: Block destructive actions but keep routing", () => {
    const ctx: ShigorDecisionContext = {
      operatorState: s({}),
      pulseCorrection: createPulse({ hasIntegrityBreach: true, integritySeverity: "critical", activeSafeMode: true }),
      oracleSignal: { leadPersona: "anton", depthLevel: 0.5, warmth: 0.5, readinessMatch: 0.5, truthDensity: 0.5, silenceAfter: false, deferTruth: false }
    };

    const decision = computeShigorDecision(ctx);
    // Integrity blocks actions
    expect(decision.blockDestructiveActions).toBe(true);
    // But doesn't necessarily force deferTruth or persona change if severity is just integrity
    expect(decision.leadPersona).toBe("anton"); 
    expect(decision.rationaleCodes).toContain("INTEGRITY_PROTECT");
  });

  it("6. Recovery: Safe mode clears when pulse schisms disappear", () => {
    const safeCtx: ShigorDecisionContext = {
      operatorState: s({}),
      pulseCorrection: createPulse({ hasPipelineFailure: true, pipelineSeverity: "critical", activeSafeMode: true }),
      oracleSignal: { leadPersona: "anton", depthLevel: 0.5, warmth: 0.5, readinessMatch: 0.5, truthDensity: 0.5, silenceAfter: false, deferTruth: false }
    };
    expect(computeShigorDecision(safeCtx).leadPersona).toBe("svitlana");

    const recoveredCtx: ShigorDecisionContext = {
      operatorState: s({}),
      pulseCorrection: createPulse({ activeSafeMode: false }),
      oracleSignal: { leadPersona: "anton", depthLevel: 0.5, warmth: 0.5, readinessMatch: 0.5, truthDensity: 0.5, silenceAfter: false, deferTruth: false }
    };
    expect(computeShigorDecision(recoveredCtx).leadPersona).toBe("anton");
  });

  it("7. Non-overreaction: Warning level should not trigger hard force-defer", () => {
    const ctx: ShigorDecisionContext = {
      operatorState: s({}),
      pulseCorrection: createPulse({ hasPipelineFailure: true, pipelineSeverity: "warn", activeSafeMode: true }),
      oracleSignal: { leadPersona: "anton", depthLevel: 0.5, warmth: 0.5, readinessMatch: 0.5, truthDensity: 0.5, silenceAfter: false, deferTruth: false }
    };

    const decision = computeShigorDecision(ctx);
    // Bias should lean Svitlana but maybe not enough to win if oracle is strong?
    // In our implementation, bias 0.35 (warn) + oracle 0.5 (normal) = 0.85 (Svitlana) vs 0.5 (Anton)
    // Actually Svitlana wins here due to scoring, but let's check deferTruth.
    expect(decision.deferTruth).toBe(false); // Only critical forces defer
  });

  it("8. Epistemic Brake: Dominant bias for Elisey", () => {
    const ctx: ShigorDecisionContext = {
      operatorState: s({ integrityFlags: { epistemicBrake: true } }),
      oracleSignal: { leadPersona: "anton", depthLevel: 0.5, warmth: 0.5, readinessMatch: 0.8, truthDensity: 0.3, silenceAfter: false, deferTruth: false }
    };

    const decision = computeShigorDecision(ctx);
    // Epistemic brake + Oracle Anton -> Elisey should win due to 0.8 bias.
    expect(decision.leadPersona).toBe("elisey");
    expect(decision.rationaleCodes).toContain("EPISTEMIC_BRAKE");
  });
});
