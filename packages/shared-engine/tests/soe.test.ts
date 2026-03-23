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
    expect(r.fusionHintCodes).toEqual(["NOMINAL_VERIFY_MILE"]);
    expect(r.fusionHintLines[0]).toContain("soe_fusion:");
  });

  it("high failure rate suggests relax entropy path", () => {
    const r = computeSoeRecommendations({
      meanPanelistMs: 1000,
      triadFailureRate: 0.4,
      gateDropRate: 0.1,
    });
    expect(r.relaxAdversarialEntropy).toBe(true);
    expect(r.fusionHintCodes).toContain("KEYS_AND_TIMEOUTS");
    expect(r.fusionHintCodes).toContain("API_CONSTRAINT_ENTROPY");
  });

  it("heavy gate drop suggests tighten review", () => {
    const r = computeSoeRecommendations({
      meanPanelistMs: 2000,
      triadFailureRate: 0.05,
      gateDropRate: 0.7,
    });
    expect(r.tightenGates).toBe(true);
    expect(r.fusionHintCodes).toContain("GATE_SOURCE_QC");
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
    expect(r.fusionHintCodes).toContain("LATENCY_PROMPT_UX");
    expect(r.fusionHintCodes).toContain("GOVERNANCE_VELOCITY");
  });

  it("stub-heavy telemetry adds parity fusion hint", () => {
    const r = computeSoeRecommendations({
      meanPanelistMs: 800,
      triadFailureRate: 0,
      gateDropRate: 0.1,
      triadStubRunFraction: 0.9,
    });
    expect(r.fusionHintCodes).toContain("STUB_PROD_PARITY");
    expect(r.fusionHintCodes).not.toContain("NOMINAL_VERIFY_MILE");
  });

  it("dual stress adds STRESSED_DUAL fusion hint", () => {
    const r = computeSoeRecommendations({
      meanPanelistMs: 1000,
      triadFailureRate: 0.4,
      gateDropRate: 0.7,
    });
    expect(r.relaxAdversarialEntropy).toBe(true);
    expect(r.tightenGates).toBe(false);
    expect(r.message).toContain("stressed");
    expect(r.fusionHintCodes).toContain("STRESSED_DUAL");
    expect(r.fusionHintCodes).toContain("KEYS_AND_TIMEOUTS");
    expect(r.fusionHintCodes).toContain("API_CONSTRAINT_ENTROPY");
  });
});
