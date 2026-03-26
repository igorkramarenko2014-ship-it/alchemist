import { describe, expect, it, vi } from "vitest";
import { ATHENA_SOE_RECALIBRATION_LINE } from "../triad-panel-governance";
import {
  computeSoeRecommendations,
  logSoeHintWithIomContext,
  logSoeIomContext,
  logSoeIomFusion,
} from "../soe";

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

  it("optional realityGroundTruth appends low-adoption hint when window is large enough", () => {
    const r = computeSoeRecommendations({
      meanPanelistMs: 800,
      triadFailureRate: 0,
      gateDropRate: 0.1,
      realityGroundTruth: {
        sampleWindowEvents: 25,
        outputUsedCount: 1,
        outputModifiedCount: 2,
        outputDiscardedCount: 17,
      },
    });
    expect(r.message).toContain("Reality signal: low output adoption");
  });

  it("realityGroundTruth ignored when sample window too small", () => {
    const r = computeSoeRecommendations({
      meanPanelistMs: 800,
      triadFailureRate: 0,
      gateDropRate: 0.1,
      realityGroundTruth: {
        sampleWindowEvents: 5,
        outputUsedCount: 0,
        outputDiscardedCount: 5,
      },
    });
    expect(r.message).not.toContain("Reality signal:");
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

  it("optional IOM schism codes append power-cell impact to message", () => {
    const r = computeSoeRecommendations(
      {
        meanPanelistMs: 2000,
        triadFailureRate: 0.05,
        gateDropRate: 0.7,
      },
      { iomSchismCodes: ["MODEL_GATE_DECOUPLE"] },
    );
    expect(r.message).toContain("IOM impact:");
    expect(r.message).toContain("slavic_score");
    expect(r.iomImpactCellCount).toBe(3);
    expect(r.iomAffectedCellIds).toEqual([
      "gatekeeper",
      "slavic_score",
      "undercover_adversarial",
    ]);
  });

  it("iomCoverageScore appends to IOM impact line when schisms map to cells", () => {
    const r = computeSoeRecommendations(
      {
        meanPanelistMs: 2000,
        triadFailureRate: 0.05,
        gateDropRate: 0.7,
      },
      { iomSchismCodes: ["MODEL_GATE_DECOUPLE"], iomCoverageScore: 0.78 },
    );
    expect(r.message).toContain("test↔cell coverage 0.78");
    expect(r.iomCoverageScoreEcho).toBe(0.78);
  });

  it("iomCoverageScore alone (no schisms) warns when below 1", () => {
    const r = computeSoeRecommendations(
      { meanPanelistMs: 800, triadFailureRate: 0, gateDropRate: 0.1 },
      { iomCoverageScore: 0.55 },
    );
    expect(r.message).toContain("IOM test↔cell coverage: 0.55");
  });

  it("logSoeHintWithIomContext emits soe_hint_with_iom_context when IOM fields set", () => {
    const spy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const r = computeSoeRecommendations(
      { meanPanelistMs: 2000, triadFailureRate: 0.05, gateDropRate: 0.7 },
      { iomSchismCodes: ["MODEL_GATE_DECOUPLE"] },
    );
    logSoeHintWithIomContext(r, { probe: "vitest" });
    const line = spy.mock.calls.map((c) => String(c[0])).join("");
    spy.mockRestore();
    expect(line).toContain('"event":"soe_hint_with_iom_context"');
    expect(line).toContain("MODEL_GATE_DECOUPLE");
  });

  it("logSoeIomContext emits soe_iom_context with coverage + schisms", () => {
    const spy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const r = computeSoeRecommendations(
      { meanPanelistMs: 2000, triadFailureRate: 0.05, gateDropRate: 0.7 },
      { iomSchismCodes: ["MODEL_GATE_DECOUPLE"], iomCoverageScore: 0.78 },
    );
    logSoeIomContext(
      r,
      { iomSchismCodes: ["MODEL_GATE_DECOUPLE"], iomCoverageScore: 0.78 },
      { probe: "vitest" },
    );
    const line = spy.mock.calls.map((c) => String(c[0])).join("");
    spy.mockRestore();
    expect(line).toContain('"event":"soe_iom_context"');
    expect(line).toContain("0.78");
  });

  it("logSoeIomFusion emits soe_iom_fusion", () => {
    const spy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const r = computeSoeRecommendations(
      { meanPanelistMs: 2000, triadFailureRate: 0.05, gateDropRate: 0.7 },
      { iomSchismCodes: ["MODEL_GATE_DECOUPLE"], iomCoverageScore: 0.82 },
    );
    logSoeIomFusion(
      r,
      { iomSchismCodes: ["MODEL_GATE_DECOUPLE"], iomCoverageScore: 0.82 },
      { probe: "vitest" },
    );
    const line = spy.mock.calls.map((c) => String(c[0])).join("");
    spy.mockRestore();
    expect(line).toContain('"event":"soe_iom_fusion"');
    expect(line).toContain("fusionHintLineSample");
  });
});
