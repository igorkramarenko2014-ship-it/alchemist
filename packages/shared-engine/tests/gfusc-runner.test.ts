import { describe, expect, it } from "vitest";

import { runGFUSCScenarios } from "../gfusc/runner";
import { GFUSC_VECTOR_IDS } from "../gfusc/vectors";

describe("runGFUSCScenarios", () => {
  it("defines the full 17-vector taxonomy", () => {
    expect(GFUSC_VECTOR_IDS).toHaveLength(17);
  });

  it("returns CLEAR for low-signal scenarios", () => {
    const result = runGFUSCScenarios({
      scenarioId: "clear_case",
      source: "synthetic",
      vectorSignals: {
        FINANCIAL_HARM: { strength: 0.2, evidenceRefs: ["signal:a"] },
      },
      aggregateRisk: 0.1,
    });

    expect(result.verdict).toBe("CLEAR");
    expect(result.harmIndex).toBeLessThan(70);
    expect(result.triggeredVectors).toHaveLength(0);
  });

  it("burns on a high-severity threshold crossing", () => {
    const result = runGFUSCScenarios({
      scenarioId: "critical_financial",
      source: "synthetic",
      vectorSignals: {
        FINANCIAL_HARM: { strength: 1, evidenceRefs: ["signal:b"] },
      },
    });

    expect(result.verdict).toBe("BURN_CONDITION");
    expect(result.triggeredVectors).toContain("FINANCIAL_HARM");
  });

  it("burns immediately on zero-tolerance vectors", () => {
    const result = runGFUSCScenarios({
      scenarioId: "military",
      source: "synthetic",
      vectorSignals: {
        MILITARY_TARGETING: { strength: 0.01, evidenceRefs: ["signal:c"] },
      },
    });

    expect(result.verdict).toBe("BURN_CONDITION");
  });
});
