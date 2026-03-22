import { describe, expect, it } from "vitest";
import type { AICandidate, SerumState } from "@alchemist/shared-types";
import {
  cosineSimilarityParamArrays,
  scoreCandidates,
  SLAVIC_FILTER_COSINE_THRESHOLD,
  slavicFilterDedupe,
  weightedScore,
} from "../score";
import {
  candidatePassesDistributionGate,
  getContextualEntropyThreshold,
  passesAdversarialSanity,
  passesDistributionGate,
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

const TEST_REASONING =
  "Synthetic test candidate reasoning for Slavic and distribution gate coverage.";

function cand(
  panelist: AICandidate["panelist"],
  score: number,
  paramArray?: number[]
): AICandidate {
  return {
    state: emptyState(),
    score,
    reasoning: TEST_REASONING,
    panelist,
    ...(paramArray != null && { paramArray }),
  };
}

describe("Undercover CAI — distribution gate", () => {
  it("rejects flat mean with no uniqueness", () => {
    const flat = Array.from({ length: 32 }, () => 0.5);
    expect(passesDistributionGate(flat)).toBe(false);
  });

  it("rejects all-edge values", () => {
    const edges = Array.from({ length: 32 }, (_, i) => (i % 2 === 0 ? 0.02 : 0.98));
    expect(passesDistributionGate(edges)).toBe(false);
  });

  it("accepts healthy spread", () => {
    const spread = Array.from({ length: 32 }, (_, i) => ((i * 17) % 100) / 100);
    expect(passesDistributionGate(spread)).toBe(true);
  });

  it("candidate without paramArray passes gate", () => {
    expect(candidatePassesDistributionGate(cand("LLAMA", 0.5))).toBe(true);
  });
});

describe("Slavic — contextual entropy", () => {
  it("lowers floor for bass/lead family", () => {
    expect(getContextualEntropyThreshold("heavy bass")).toBe(1.2);
    expect(getContextualEntropyThreshold("pluck lead")).toBe(1.2);
  });
  it("raises floor for texture family", () => {
    expect(getContextualEntropyThreshold("ambient pad texture")).toBe(1.8);
    expect(getContextualEntropyThreshold("dark atmo fx")).toBe(1.8);
  });
  it("default 1.5", () => {
    expect(getContextualEntropyThreshold("something else")).toBe(1.5);
  });
});

describe("Slavic — cosine dedup", () => {
  it("identical vectors ~1.0 similarity", () => {
    const v = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8];
    expect(cosineSimilarityParamArrays(v, [...v])).toBeCloseTo(1, 5);
  });

  it("orthogonal-ish low similarity", () => {
    const a = [1, 0, 0, 0, 0, 0, 0, 0];
    const b = [0, 1, 0, 0, 0, 0, 0, 0];
    expect(cosineSimilarityParamArrays(a, b)).toBe(0);
  });

  it("dedup keeps higher weighted candidate", () => {
    const base = Array.from({ length: 16 }, (_, i) => i / 20);
    const a = cand("DEEPSEEK", 0.9, [...base]);
    const b = cand("LLAMA", 0.4, base.map((x) => x + 0.0001));
    const out = slavicFilterDedupe([a, b]);
    expect(out.length).toBe(1);
    expect(out[0].panelist).toBe("DEEPSEEK");
  });

  it("scoreCandidates applies filter, dedup (score order preserved)", () => {
    const v = Array.from({ length: 20 }, (_, i) => ((i * 3) % 97) / 100);
    const list = [
      cand("QWEN", 0.8, v),
      cand("DEEPSEEK", 0.95, v.map((x) => x + 0.001)),
      cand("LLAMA", 0.7, undefined),
    ];
    const out = scoreCandidates(list);
    expect(out.length).toBe(2);
    expect(weightedScore(out[0])).toBeGreaterThanOrEqual(weightedScore(out[1]));
    expect(SLAVIC_FILTER_COSINE_THRESHOLD).toBe(0.8);
  });
});

describe("Adversarial + contextual entropy", () => {
  it("passesAdversarialSanity respects custom entropy floor", () => {
    const spread = Array.from({ length: 32 }, (_, i) => ((i * 17) % 100) / 100);
    expect(passesAdversarialSanity(spread, 1.2)).toBe(true);
    // 10-bin Shannon max is log2(10) ≈ 3.32 — demand impossible floor → fail
    expect(passesAdversarialSanity(spread, 4)).toBe(false);
  });
});
