import { describe, expect, it } from "vitest";
import { computePlfDecision, evaluateSignals, generateLowCostProbe } from "../power-logic-fusion";
import type { AICandidate } from "@alchemist/shared-types";
import { detectCreativeResonance, detectRedZoneResonance } from "../arbitration/social-probe";

describe("power-logic-fusion", () => {
  it("assigns high confidence for aligned healthy signal set", () => {
    const confidence = evaluateSignals({
      gateDropRate: 0.05,
      triadFailureRate: 0,
      pnhInterventionCount: 0,
      candidateCount: 3,
    });
    expect(confidence).toBe("high");
    expect(generateLowCostProbe(confidence)).toBe("none");
  });

  it("computes deterministic decision surface", () => {
    const d = computePlfDecision(
      {
        gateDropRate: 0.7,
        triadFailureRate: 0.4,
        pnhInterventionCount: 2,
        candidateCount: 1,
      },
      false
    );
    expect(["low", "medium", "high"]).toContain(d.confidence);
    expect(["none", "creative_stance", "contrast_constraint"]).toContain(d.probe);
    expect(["valid", "noise"]).toContain(d.classification);
  });
});

describe("social-probe arbitration", () => {
  it("returns bounded creative resonance score", () => {
    const candidate: AICandidate = {
      panelist: "DEEPSEEK",
      score: 0.9,
      reasoning: "Evolving harmonic motion with gritty top-end texture and modulation interplay.",
      state: {} as AICandidate["state"],
      paramArray: Array.from({ length: 24 }, (_, i) => (i % 2 === 0 ? 0.9 : 0.1)),
    };
    const s = detectCreativeResonance("dark evolving bass texture", candidate);
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(1);
  });

  it("returns bounded red-zone resonance score", () => {
    const candidate: AICandidate = {
      panelist: "QWEN",
      score: 0.88,
      reasoning:
        "Asymmetric contrast with gritty dissonant motion; counter-shape against prompt expectation.",
      state: {} as AICandidate["state"],
      paramArray: Array.from({ length: 24 }, (_, i) => (i % 3 === 0 ? 0.95 : 0.08)),
    };
    const s = detectRedZoneResonance("smooth soft ambient pad", candidate);
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(1);
  });
});

