import { describe, expect, it } from "vitest";
import type { AIAnalysis, AICandidate } from "@alchemist/shared-types";
import { generateDecisionReceipt } from "../explainability/decision-receipt";

function candidate(panelist: "LLAMA" | "DEEPSEEK" | "QWEN", score: number, reasoning: string): AICandidate {
  return {
    panelist,
    score,
    reasoning,
    state: {} as AICandidate["state"],
    paramArray: [0.1, 0.2, 0.3, 0.4],
  };
}

describe("generateDecisionReceipt", () => {
  it("projects selected reason and system state without mutating scoring", () => {
    const scored: AICandidate[] = [
      candidate("DEEPSEEK", 0.91, "strong and clear reasoning for selected path"),
      candidate("LLAMA", 0.89, "another candidate with clear reasoning"),
      candidate("QWEN", 0.3, "short"),
    ];
    const analysis: AIAnalysis = {
      candidates: scored,
      triadRunTelemetry: {
        meanPanelistMs: 120,
        triadFailureRate: 0,
        gateDropRate: 0.1,
        triadRunMode: "fetcher",
        rawCandidateCount: 3,
        afterGateCount: 3,
        triadParityMode: "fully_live",
        triadDegraded: false,
      },
    };

    const receipt = generateDecisionReceipt(analysis, scored, {
      wasmStatus: "available",
      hardGateStatus: "enforced",
      stubUsage: false,
    });

    expect(receipt.selectedCandidateId).toBe("deepseek_1");
    expect(receipt.triadMode).toBe("fetcher");
    expect(receipt.selectionReason.length).toBeGreaterThan(0);
    expect(receipt.systemState.wasmStatus).toBe("available");
    expect(receipt.systemState.stubUsage).toBe(false);
  });
});
