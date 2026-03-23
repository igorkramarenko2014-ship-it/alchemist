import { describe, expect, it } from "vitest";
import type { AICandidate, SerumState } from "@alchemist/shared-types";
import { scoreCandidates, scoreCandidatesWithGate } from "../score";
import {
  GATEKEEPER_MIN_DURATION_MS,
  GATEKEEPER_MIN_SAMPLES,
  isDataPure,
  isTemporalFlowPure,
  isTelemetryPureFromCandidates,
  isTelemetryScoreSeriesPure,
  STATUS_NOISY,
} from "../validate";

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
  "Gatekeeper telemetry test candidate reasoning meets minimum char length.";

function cand(
  panelist: AICandidate["panelist"],
  score: number,
  paramArray?: number[]
): AICandidate {
  return {
    state: emptyState(),
    score,
    reasoning: REASON,
    panelist,
    ...(paramArray != null && { paramArray }),
  };
}

describe("Gatekeeper — telemetry score stream", () => {
  it(`passes when fewer than ${GATEKEEPER_MIN_SAMPLES} scores`, () => {
    expect(isTelemetryScoreSeriesPure([0.1, 0.9])).toBe(true);
    expect(isTelemetryPureFromCandidates([cand("LLAMA", 0.2), cand("QWEN", 0.8)])).toBe(true);
  });

  it("rejects non-finite scores", () => {
    expect(isTelemetryPureFromCandidates([cand("LLAMA", NaN), cand("QWEN", 0.5)])).toBe(false);
  });

  it("rejects global Tukey outlier among 5+ tight scores", () => {
    const scores = [0.5, 0.51, 0.5, 0.52, 0.99];
    expect(isTelemetryScoreSeriesPure(scores)).toBe(false);
    const candidates = scores.map((s, i) =>
      cand(i === 0 ? "LLAMA" : i === 1 ? "DEEPSEEK" : i === 2 ? "QWEN" : i === 3 ? "LLAMA" : "DEEPSEEK", s)
    );
    expect(isTelemetryPureFromCandidates(candidates)).toBe(false);
  });

  it("accepts homogeneous healthy band", () => {
    const scores = [0.55, 0.52, 0.54, 0.53, 0.56];
    expect(isTelemetryScoreSeriesPure(scores)).toBe(true);
  });

  it("scoreCandidatesWithGate returns STATUS_NOISY and empty list when batch is dirty", () => {
    const panels: AICandidate["panelist"][] = ["LLAMA", "DEEPSEEK", "QWEN", "LLAMA", "DEEPSEEK"];
    const dirty = [0.5, 0.51, 0.5, 0.52, 0.99].map((s, i) => cand(panels[i], s));
    const r = scoreCandidatesWithGate(dirty);
    expect(r.status).toBe(STATUS_NOISY);
    expect(r.candidates).toEqual([]);
  });

  it("scoreCandidates still runs Slavic path when gate passes", () => {
    const v = Array.from({ length: 20 }, (_, i) => ((i * 3) % 97) / 100);
    // Seven scores in a tight band (Gatekeeper OK) but weighted + Slavic drops one duplicate vector.
    const list = [
      cand("QWEN", 0.55),
      cand("DEEPSEEK", 0.56),
      cand("LLAMA", 0.54),
      cand("QWEN", 0.53),
      cand("DEEPSEEK", 0.57),
      cand("LLAMA", 0.58, v),
      cand("DEEPSEEK", 0.59, v.map((x) => x + 0.001)),
    ];
    const out = scoreCandidates(list);
    expect(out.length).toBe(6);
    expect(scoreCandidatesWithGate(list).status).toBe("OK");
  });
});

describe("Gatekeeper — latency pulse (durationMs parallel series)", () => {
  it("isTemporalFlowPure: empty passes", () => {
    expect(isTemporalFlowPure([])).toBe(true);
  });

  it(`rejects durations below ${GATEKEEPER_MIN_DURATION_MS}ms (bot-like)`, () => {
    expect(isTemporalFlowPure([50, 300, 400])).toBe(false);
    expect(isTemporalFlowPure([Number.NaN, 400])).toBe(false);
  });

  it("rejects stall/burst under same IQR+Z machinery when n >= 5", () => {
    expect(isTemporalFlowPure([500, 510, 505, 515, 12_000])).toBe(false);
  });

  it("accepts tight pacing band", () => {
    expect(isTemporalFlowPure([410, 420, 415, 418, 425])).toBe(true);
  });

  it("isTelemetryPureFromCandidates fails when duration length ≠ candidates", () => {
    const c = [cand("LLAMA", 0.5), cand("QWEN", 0.5)];
    expect(isTelemetryPureFromCandidates(c, [300])).toBe(false);
  });

  it("isDataPure matches composite with optional durations", () => {
    const c = [cand("LLAMA", 0.5), cand("QWEN", 0.6)];
    expect(isDataPure(c)).toBe(true);
    expect(isDataPure(c, [300, 310])).toBe(true);
  });

  it("scoreCandidatesWithGate is NOISY when scores OK but temporal floor fails", () => {
    const panels: AICandidate["panelist"][] = ["LLAMA", "DEEPSEEK", "QWEN", "LLAMA", "DEEPSEEK", "QWEN", "LLAMA"];
    const list = [0.55, 0.56, 0.54, 0.53, 0.57, 0.58, 0.56].map((s, i) => cand(panels[i], s));
    const fast = list.map(() => 50);
    const r = scoreCandidatesWithGate(list, undefined, fast);
    expect(r.status).toBe(STATUS_NOISY);
    expect(r.candidates).toEqual([]);
    expect(r.creativePivot?.idea).toBeDefined();
  });

  it("scoreCandidates third arg: OK temporal keeps stable AICandidate[] shape", () => {
    const panels: AICandidate["panelist"][] = ["LLAMA", "DEEPSEEK", "QWEN", "LLAMA", "DEEPSEEK", "QWEN", "LLAMA"];
    const list = [0.55, 0.56, 0.54, 0.53, 0.57, 0.58, 0.56].map((s, i) => cand(panels[i], s));
    const ms = [400, 410, 405, 415, 408, 420, 412];
    const out = scoreCandidates(list, undefined, ms);
    expect(out.length).toBeGreaterThan(0);
    for (const x of out) {
      expect(Object.keys(x).includes("durationMs")).toBe(false);
    }
  });
});
