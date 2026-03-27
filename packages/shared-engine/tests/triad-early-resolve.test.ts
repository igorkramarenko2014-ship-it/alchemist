import { describe, expect, it } from "vitest";
import type { AICandidate, Panelist, SerumState } from "@alchemist/shared-types";
import { runTriad } from "../triad";

function emptyState(): SerumState {
  return {
    meta: {},
    master: {},
    oscA: {},
    oscB: {},
    noise: {},
    filter: {},
    envelopes: [],
    lfos: [],
    fx: {},
    matrix: [],
  };
}

const REASON =
  "Triad early resolve test reasoning meets minimum character length for validation.";

function pa(offset: number): number[] {
  return Array.from({ length: 16 }, (_, i) => Math.min(0.99, 0.05 + (i + offset) * 0.03));
}

function cand(panelist: AICandidate["panelist"], score: number, offset: number): AICandidate {
  return {
    state: emptyState(),
    score,
    reasoning: REASON,
    panelist,
    paramArray: pa(offset),
  };
}

/** Must reject on abort so early-resolve can settle without waiting panel client timeout. */
function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    const onAbort = () => {
      clearTimeout(t);
      reject(new Error("aborted"));
    };
    if (signal.aborted) {
      onAbort();
      return;
    }
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

describe("runTriad triadEarlyResolveTwo", () => {
  it("when two panelists return high-score gated candidates first, sets triadEarlyResolveTwo telemetry", async () => {
    const fetcher = async (_prompt: string, panelist: Panelist, signal: AbortSignal) => {
      if (panelist === "LLAMA") {
        await delay(30, signal);
        if (signal.aborted) return [];
        return [cand("LLAMA", 0.95, 1), cand("LLAMA", 0.94, 2)];
      }
      if (panelist === "DEEPSEEK") {
        await delay(30, signal);
        if (signal.aborted) return [];
        return [cand("DEEPSEEK", 0.95, 10), cand("DEEPSEEK", 0.93, 11)];
      }
      await delay(10_000, signal);
      if (signal.aborted) return [];
      return [cand("QWEN", 0.9, 20)];
    };

    /** Floor vs post-gate blended scores (see triad-pulse tests ~0.62); not raw LLM score. */
    const a = await runTriad(`triad-early-${Date.now()}`, {
      fetcher,
      skipTablebase: true,
      triadEarlyResolveTwo: true,
      triadEarlyResolveScoreFloor: 0.55,
    });

    expect(a.triadRunTelemetry?.triadEarlyResolveTwo).toBe(true);
    expect(a.triadRunTelemetry?.triadEarlyResolveScoreFloor).toBe(0.55);
    expect(a.candidates.length).toBeGreaterThan(0);
  });

  it("does not set early resolve when flag is off", async () => {
    const fetcher = async (_prompt: string, panelist: Panelist, _signal: AbortSignal) => {
      await new Promise((r) => setTimeout(r, 50));
      return [cand(panelist, 0.95, panelist === "LLAMA" ? 1 : 3)];
    };
    const a = await runTriad(`triad-no-early-${Date.now()}`, {
      fetcher,
      skipTablebase: true,
    });
    expect(a.triadRunTelemetry?.triadEarlyResolveTwo).toBeUndefined();
  });

  it("supports fastResolve alias with default floor 0.85", async () => {
    const fetcher = async (_prompt: string, panelist: Panelist, signal: AbortSignal) => {
      if (panelist === "LLAMA") {
        await delay(30, signal);
        if (signal.aborted) return [];
        return [cand("LLAMA", 0.95, 1)];
      }
      if (panelist === "DEEPSEEK") {
        await delay(30, signal);
        if (signal.aborted) return [];
        return [cand("DEEPSEEK", 0.95, 10)];
      }
      await delay(10_000, signal);
      if (signal.aborted) return [];
      return [cand("QWEN", 0.9, 20)];
    };
    const a = await runTriad(`triad-fast-resolve-${Date.now()}`, {
      fetcher,
      skipTablebase: true,
      fastResolve: true,
    });
    expect(a.triadRunTelemetry?.triadEarlyResolveTwo).toBe(true);
    expect(a.triadRunTelemetry?.triadEarlyResolveScoreFloor).toBe(0.85);
  });
});
