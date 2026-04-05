import { describe, it, expect, vi } from "vitest";
import { runQuantumCycle } from "../triad-quantum-cycle";
import type { AICandidate, Panelist } from "@alchemist/shared-types";

describe("Triad Quantum Cycle (Stage 1)", () => {
  const mockCandidate = (panelist: Panelist, score: number, paramVal: number): AICandidate => ({
    state: {} as any,
    score,
    reasoning: `Reasoning from ${panelist}`,
    panelist,
    paramArray: Array(128).fill(paramVal)
  });

  it("should execute two rounds and match the expected prompt flow", async () => {
    const fetcher = vi.fn().mockImplementation(async (prompt, panelist) => {
      // Use distinct values for Round 2 to ensure non-parallel vectors (novelty > 0)
      const isRound2 = prompt.includes("CONTEXT_FROM_OTHER_PANELISTS");
      const val = isRound2 ? 0.6 : 0.5;
      const paramArray = Array(128).fill(val);
      if (isRound2) paramArray[0] = 0.9; // Break parallelism
      return [{
        state: {} as any,
        score: 0.8,
        reasoning: `Reasoning from ${panelist} ${isRound2 ? "R2" : "R1"}`,
        panelist,
        paramArray
      }];
    });

    const result = await runQuantumCycle("Test Prompt", {
      runId: "test_run",
      fetcher,
      userMode: "PRO"
    });

    // Round 1: 3 calls
    // Round 2: 3 calls
    expect(fetcher).toHaveBeenCalledTimes(6);

    // Verify Round 1 calls (first 3)
    const firstCall = fetcher.mock.calls[0];
    expect(firstCall[0]).toBe("Test Prompt");

    // Verify Round 2 calls (last 3)
    const fourthCall = fetcher.mock.calls[3];
    expect(fourthCall[0]).toContain("Test Prompt");
    expect(fourthCall[0]).toContain("CONTEXT_FROM_OTHER_PANELISTS");

    // Verify Telemetry
    const tel = result.quantumTelemetry;
    expect(tel).toBeDefined();
    expect(tel!.roundLogs.length).toBe(6);
    expect(tel!.roundLogs.filter(l => l.round === 1).length).toBe(3);
    expect(tel!.roundLogs.filter(l => l.round === 2).length).toBe(3);

    // Verify Deltas
    const deltas = tel!.roundLogs.filter(l => l.round === 2).map(l => l.delta);
    expect(deltas.length).toBe(3);
    deltas.forEach(d => {
      expect(d?.novelty_score).toBeGreaterThan(0);
      expect(d?.impact_score).toBeGreaterThan(0);
    });

    // Verify final candidates come from Round 2 logic
    expect(result.analysis.candidates.length).toBe(3);
  });

  it("should fallback to Round 1 results if Round 2 fails", async () => {
    let callCount = 0;
    const fetcher = vi.fn().mockImplementation(async (prompt) => {
      callCount++;
      if (prompt.includes("CONTEXT_FROM_OTHER_PANELISTS")) {
        throw new Error("Round 2 network failure");
      }
      return [mockCandidate("LLAMA", 0.7, 0.5)];
    });

    const result = await runQuantumCycle("Test Prompt", {
      runId: "fallback_run",
      fetcher
    });

    expect(result.quantumTelemetry?.fallbackUsed).toBe(true);
    expect(result.quantumTelemetry?.fallbackReason).toBe("round_2_incomplete");
    // Should still have Round 1 candidates
    expect(result.analysis.candidates.length).toBe(3);
  });
});
