import { describe, expect, it } from "vitest";
import type { AICandidate } from "@alchemist/shared-types";
import { finalizeCandidates, type CandidatePipelineState } from "../candidate-finalizer";

function c(panelist: AICandidate["panelist"], score: number): AICandidate {
  return {
    panelist,
    score,
    reasoning: "candidate finalizer test reasoning is valid and long enough",
    state: {} as AICandidate["state"],
    paramArray: [0.1, 0.2, 0.3, 0.4],
  };
}

describe("finalizeCandidates", () => {
  it("keeps score-floor and preserves provenance ordering", () => {
    const states: CandidatePipelineState[] = [
      {
        raw: c("LLAMA", 0.4),
        repaired: c("LLAMA", 0.4),
        final: c("LLAMA", 0.4),
        provenance: { repairedAt: "none", scoredBy: "combined", panelist: "LLAMA", revision: 1 },
      },
      {
        raw: c("DEEPSEEK", 0.92),
        repaired: c("DEEPSEEK", 0.92),
        final: c("DEEPSEEK", 0.92),
        provenance: { repairedAt: "none", scoredBy: "combined", panelist: "DEEPSEEK", revision: 2 },
      },
    ];
    const out = finalizeCandidates(states, { scoreFloor: 0.5, maxCandidates: 8 });
    expect(out).toHaveLength(1);
    expect(out[0].panelist).toBe("DEEPSEEK");
    const prov = (out[0] as unknown as { _provenance?: { revision?: number } })._provenance;
    expect(prov?.revision).toBe(2);
  });
});
