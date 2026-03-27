import { describe, expect, it } from "vitest";
import type { AICandidate } from "@alchemist/shared-types";
import { evaluateProbeResult } from "../probe-intelligence-layer";

function candidate(score: number): AICandidate {
  return {
    panelist: "LLAMA",
    score,
    reasoning: "probe intelligence stable reasoning payload",
    state: {} as AICandidate["state"],
    paramArray: [0.1, 0.5, 0.9, 0.2, 0.8, 0.3, 0.7, 0.4],
  };
}

describe("probe-intelligence-layer", () => {
  it("classifies strong response for healthy aligned run", () => {
    const r = evaluateProbeResult({
      signal: "creative_stance",
      candidates: [candidate(0.92), candidate(0.84)],
      triadFailureRate: 0,
      gateDropRate: 0.1,
    });
    expect(r.classification).toBe("strong");
    expect(r.responseQuality).toBeGreaterThan(0.7);
  });

  it("classifies weak response for sparse degraded run", () => {
    const r = evaluateProbeResult({
      signal: "contrast_constraint",
      candidates: [candidate(0.2)],
      triadFailureRate: 0.8,
      gateDropRate: 0.8,
    });
    expect(r.classification).toBe("weak");
    expect(r.responseQuality).toBeLessThan(0.45);
  });
});

