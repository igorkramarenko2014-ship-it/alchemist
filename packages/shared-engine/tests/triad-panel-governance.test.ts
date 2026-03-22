import { describe, expect, it } from "vitest";
import {
  ALT_TRIAD_GOVERNANCE_WEIGHTS_EFFICIENCY,
  ATHENA_SOE_RECALIBRATION_LINE,
  computeTriadGovernance,
  DEFAULT_TRIAD_GOVERNANCE_WEIGHTS,
  PANELIST_ALCHEMIST_CODENAME,
  velocityScoreFromMeanPanelistMs,
} from "../triad-panel-governance";

describe("Triad Panel governance (TS, not DSP)", () => {
  it("maps panelists to Greek codenames — DEEPSEEK is Athena (lead weight)", () => {
    expect(PANELIST_ALCHEMIST_CODENAME.DEEPSEEK).toBe("ATHENA");
    expect(PANELIST_ALCHEMIST_CODENAME.LLAMA).toBe("HERMES");
    expect(PANELIST_ALCHEMIST_CODENAME.QWEN).toBe("HESTIA");
  });

  it("default governance weights sum to 1", () => {
    const w = DEFAULT_TRIAD_GOVERNANCE_WEIGHTS;
    expect(w.presetFidelity + w.computationalVelocity + w.resourceFrugality).toBeCloseTo(1, 6);
  });

  it("alt efficiency-first weights sum to 1", () => {
    const w = ALT_TRIAD_GOVERNANCE_WEIGHTS_EFFICIENCY;
    expect(w.presetFidelity + w.computationalVelocity + w.resourceFrugality).toBeCloseTo(1, 6);
  });

  it("velocity score drops as latency rises", () => {
    expect(velocityScoreFromMeanPanelistMs(500)).toBeGreaterThan(0.9);
    expect(velocityScoreFromMeanPanelistMs(12_000)).toBeLessThan(0.7);
  });

  it("recommends Athena SOE recalibration when velocity component under 0.7", () => {
    const g = computeTriadGovernance({
      meanPanelistMs: 12_000,
      triadFailureRate: 0,
      gateDropRate: 0,
    });
    expect(g.scores.computationalVelocity).toBeLessThan(0.7);
    expect(g.athenaSoeRecalibrationRecommended).toBe(true);
    expect(ATHENA_SOE_RECALIBRATION_LINE).toContain("ATHENA_SOE_ACTIVE");
  });

  it("healthy snapshot: high fidelity, fast panelists, no failures", () => {
    const g = computeTriadGovernance({
      meanPanelistMs: 900,
      triadFailureRate: 0,
      gateDropRate: 0.05,
    });
    expect(g.healthScore).toBeGreaterThan(0.85);
    expect(g.athenaSoeRecalibrationRecommended).toBe(false);
  });
});
