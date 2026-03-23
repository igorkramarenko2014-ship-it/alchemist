import { describe, expect, it } from "vitest";
import {
  adminWipeMess,
  ajiCompressionRatio,
  conceptualDensity,
  runAjiCrystallization,
  thresholdLimitExceeded,
} from "../aji-logic";
import { generateEntropy } from "../entropy";
import { scoreCandidatesWithGate } from "../score";
import { STATUS_NOISY } from "../validate";
import type { AICandidate, SerumState } from "@alchemist/shared-types";

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
  "Aji entropy test candidate reasoning meets minimum character length for validation.";

function cand(panelist: AICandidate["panelist"], score: number): AICandidate {
  return {
    state: emptyState(),
    score,
    reasoning: REASON,
    panelist,
  };
}

describe("entropy + Aji crystallization", () => {
  it("generateEntropy returns 10–20 strings", () => {
    expect(generateEntropy(9, 1).length).toBe(10);
    expect(generateEntropy(25, 1).length).toBe(20);
    const mid = generateEntropy(15, 42);
    expect(mid.length).toBe(15);
  });

  it("thresholdLimitExceeded + adminWipeMess cap oversized mess", () => {
    const huge = Array.from({ length: 25 }, (_, i) => `line ${i} `.repeat(400));
    expect(thresholdLimitExceeded(huge)).toBe(true);
    const wiped = adminWipeMess(huge);
    expect(wiped.length).toBeLessThanOrEqual(20);
    expect(wiped.every((l) => l.length <= 200)).toBe(true);
  });

  it("runAjiCrystallization: residue is >90% shorter with higher conceptual density", () => {
    const mess = generateEntropy(16, 0xc0ffee);
    const bulk = mess.join(" ");
    const { idea, density } = runAjiCrystallization(mess);
    const ratio = ajiCompressionRatio(mess, idea);
    expect(ratio).toBeLessThan(0.1);
    expect(idea.length).toBeLessThan(bulk.length * 0.1);
    expect(density).toBeGreaterThan(conceptualDensity(bulk));
  });

  it("insufficient chaos returns zero density", () => {
    const g = runAjiCrystallization(["a", "b", "c", "d"]);
    expect(g.density).toBe(0);
    expect(g.idea).toContain("Insufficient");
  });
});

describe("scoreCandidatesWithGate creative pivot (dead end)", () => {
  it("attaches creativePivot when gate returns NOISY", () => {
    const panels: AICandidate["panelist"][] = ["LLAMA", "DEEPSEEK", "QWEN", "LLAMA", "DEEPSEEK"];
    const dirty = [0.5, 0.51, 0.5, 0.52, 0.99].map((s, i) => cand(panels[i], s));
    const r = scoreCandidatesWithGate(dirty, "pluck bass");
    expect(r.status).toBe(STATUS_NOISY);
    expect(r.candidates).toEqual([]);
    expect(r.creativePivot).toBeDefined();
    expect(r.creativePivot!.idea.length).toBeGreaterThan(10);
    expect(r.creativePivot!.density).toBeGreaterThan(0);
  });

  it("no creativePivot when input list is empty", () => {
    const r = scoreCandidatesWithGate([], "x");
    expect(r.candidates).toEqual([]);
    expect(r.creativePivot).toBeUndefined();
  });
});
