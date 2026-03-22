import { describe, expect, it } from "vitest";
import { ATHENA_SOE_RECALIBRATION_LINE } from "../triad-panel-governance";
import { computeSoeRecommendations } from "../soe";

describe("SOE (self-optimizing hints)", () => {
  it("nominal snapshot stays nominal", () => {
    const r = computeSoeRecommendations({
      meanPanelistMs: 800,
      triadFailureRate: 0,
      gateDropRate: 0.1,
    });
    expect(r.relaxAdversarialEntropy).toBe(false);
    expect(r.tightenGates).toBe(false);
    expect(r.message).toContain("nominal");
  });

  it("high failure rate suggests relax entropy path", () => {
    const r = computeSoeRecommendations({
      meanPanelistMs: 1000,
      triadFailureRate: 0.4,
      gateDropRate: 0.1,
    });
    expect(r.relaxAdversarialEntropy).toBe(true);
  });

  it("heavy gate drop suggests tighten review", () => {
    const r = computeSoeRecommendations({
      meanPanelistMs: 2000,
      triadFailureRate: 0.05,
      gateDropRate: 0.7,
    });
    expect(r.tightenGates).toBe(true);
  });

  it("slow panelists suggest shorter prompts and append Athena SOE banner", () => {
    const r = computeSoeRecommendations({
      meanPanelistMs: 8000,
      triadFailureRate: 0,
      gateDropRate: 0,
    });
    expect(r.suggestedPromptMaxChars).toBe(1200);
    expect(r.athenaSoeRecalibrationRecommended).toBe(true);
    expect(r.message).toContain(ATHENA_SOE_RECALIBRATION_LINE);
    expect(r.triadHealthScore).toBeDefined();
  });
});
