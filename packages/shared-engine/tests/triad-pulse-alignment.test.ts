import { describe, expect, it } from "vitest";
import type { AICandidate, Panelist, SerumState } from "@alchemist/shared-types";
import { flattenTriadChunksWithDurations, runTriad } from "../triad";
import { scoreCandidatesWithGate } from "../score";
import { STATUS_NOISY } from "../validate";

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
  "Triad pulse alignment test reasoning meets minimum character length for validation.";

function cand(panelist: AICandidate["panelist"], score: number): AICandidate {
  return {
    state: emptyState(),
    score,
    reasoning: REASON,
    panelist,
  };
}

describe("flattenTriadChunksWithDurations", () => {
  it("aligns one duration per candidate in panelist order", () => {
    const c1 = [cand("LLAMA", 0.5), cand("LLAMA", 0.6)];
    const c2 = [cand("DEEPSEEK", 0.55)];
    const c3 = [cand("QWEN", 0.52), cand("QWEN", 0.53), cand("QWEN", 0.51)];
    const { candidates, panelDurationsMs } = flattenTriadChunksWithDurations([
      { value: c1, durationMs: 100 },
      { value: c2, durationMs: 250 },
      { value: c3, durationMs: 300 },
    ]);
    expect(candidates.length).toBe(6);
    expect(panelDurationsMs).toEqual([100, 100, 250, 300, 300, 300]);
    expect(panelDurationsMs.length).toBe(candidates.length);
  });

  it("handles empty panel chunks", () => {
    const { candidates, panelDurationsMs } = flattenTriadChunksWithDurations([
      { value: [], durationMs: 400 },
      { value: [cand("QWEN", 0.5)], durationMs: 500 },
    ]);
    expect(candidates.length).toBe(1);
    expect(panelDurationsMs).toEqual([500]);
  });

  it("single chunk preserves duration for every row", () => {
    const row = [cand("LLAMA", 0.4), cand("LLAMA", 0.41)];
    const { candidates, panelDurationsMs } = flattenTriadChunksWithDurations([
      { value: row, durationMs: 999 },
    ]);
    expect(candidates).toEqual(row);
    expect(panelDurationsMs).toEqual([999, 999]);
  });
});

describe("scoreCandidatesWithGate + aligned durations", () => {
  it("rejects fast durations then score-only path is separate concern", () => {
    const panels: AICandidate["panelist"][] = ["LLAMA", "DEEPSEEK", "QWEN", "LLAMA", "DEEPSEEK"];
    const list = [0.55, 0.56, 0.54, 0.53, 0.57].map((s, i) => cand(panels[i], s));
    const durs = list.map(() => 50);
    const r = scoreCandidatesWithGate(list, "test", durs);
    expect(r.status).toBe(STATUS_NOISY);
  });
});

describe("runTriad stub — temporal fallback keeps candidates", () => {
  it("returns candidates after sub-200ms stub timings (score-only retry)", async () => {
    const a = await runTriad("pluck lead", { skipTablebase: true });
    expect(a.candidates.length).toBeGreaterThan(0);
    for (const c of a.candidates) {
      expect(Object.prototype.hasOwnProperty.call(c, "durationMs")).toBe(false);
    }
  });
});

describe("runTriad fetcher path — alignment + gate", () => {
  it("uses injected fetcher with real wall time and returns gated candidates", async () => {
    const fetcher = async (_prompt: string, panelist: Panelist, _signal: AbortSignal) => {
      await new Promise((r) => setTimeout(r, 220));
      return [
        cand(panelist, 0.62),
        cand(panelist, 0.61),
      ];
    };
    const a = await runTriad(`triad-pulse-fetcher-${Date.now()}`, {
      fetcher,
      skipTablebase: true,
    });
    expect(a.candidates.length).toBeGreaterThan(0);
    expect(a.candidates.every((c) => c.score >= 0 && c.score <= 1)).toBe(true);
  });

  it("parallel fetchers each exceed 200ms wall time → temporal gate can pass before Slavic", async () => {
    const fetcher = async (_prompt: string, panelist: Panelist, _signal: AbortSignal) => {
      await new Promise((r) => setTimeout(r, 205));
      return [cand(panelist, 0.7)];
    };
    const a = await runTriad(`triad-pulse-slow-${Date.now()}`, {
      fetcher,
      skipTablebase: true,
    });
    expect(a.candidates.length).toBeGreaterThanOrEqual(1);
  });

  it("fetcher failure yields empty candidates without throwing", async () => {
    const fetcher = async (_p: string, _panel: Panelist, _signal: AbortSignal) => {
      throw new Error("synthetic panel failure");
    };
    const a = await runTriad(`triad-pulse-fail-${Date.now()}`, {
      fetcher,
      skipTablebase: true,
    });
    expect(a.candidates).toEqual([]);
  });
});
