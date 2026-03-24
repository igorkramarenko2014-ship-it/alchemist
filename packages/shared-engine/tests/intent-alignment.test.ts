import { describe, expect, it } from "vitest";
import type { AICandidate, Panelist } from "@alchemist/shared-types";
import { computeIntentAlignmentScore, tokenSetJaccard, tokenizeForIntent } from "../intent-alignment";
import { intentBlendRankKey, scoreCandidates, weightedScore } from "../score";

function cand(panelist: Panelist, score: number, reasoning: string, paramArray?: number[]): AICandidate {
  return {
    state: { meta: {}, master: {}, oscA: {}, oscB: {}, noise: {}, filter: {}, envelopes: [], lfos: [], fx: {}, matrix: [] },
    score,
    reasoning,
    panelist,
    ...(paramArray !== undefined ? { paramArray } : {}),
  };
}

describe("intent-alignment", () => {
  it("tokenizeForIntent drops stopwords and short tokens", () => {
    expect(tokenizeForIntent("the bass patch for serum")).toEqual(["bass", "patch"]);
  });

  it("tokenSetJaccard is symmetric and bounded", () => {
    const a = ["dark", "bass", "growl"];
    const b = ["growl", "bass", "reese"];
    const j = tokenSetJaccard(a, b);
    expect(j).toBeGreaterThan(0.3);
    expect(j).toBeLessThanOrEqual(1);
    expect(tokenSetJaccard(a, b)).toBe(tokenSetJaccard(b, a));
  });

  it("computeIntentAlignmentScore favors lexical overlap with prompt", () => {
    const prompt = "dark growling reese bass";
    const onTopic = cand("DEEPSEEK", 0.9, "This patch emphasizes a dark growling bass texture with reese harmonics.");
    const offTopic = cand("LLAMA", 0.9, "Bright airy pluck lead with shimmer and glassy highs for edm.");
    const sOn = computeIntentAlignmentScore(prompt, onTopic);
    const sOff = computeIntentAlignmentScore(prompt, offTopic);
    expect(sOn).toBeGreaterThan(sOff);
  });

  it("scoreCandidates re-ranks by intent blend when prompt is set", () => {
    const v = Array.from({ length: 24 }, (_, i) => ((i * 11) % 97) / 100);
    const prompt = "lush ambient evolving pad wash";
    const padFirst = cand(
      "QWEN",
      0.82,
      "Lush ambient pad with slow evolving filter movement and wide stereo wash.",
      v,
    );
    const leadFirst = cand(
      "DEEPSEEK",
      0.48,
      "Aggressive mono lead pluck with fast attack for big-room drops.",
      undefined,
    );
    const out = scoreCandidates([leadFirst, padFirst], prompt);
    expect(out[0].reasoning).toContain("pad");
    expect(out[0].intentAlignmentScore).toBeDefined();
    expect(out[1].intentAlignmentScore).toBeDefined();
  });

  it("scoreCandidates without prompt skips intent field and preserves weighted order", () => {
    const v = Array.from({ length: 20 }, (_, i) => ((i * 3) % 97) / 100);
    const list = [
      cand("QWEN", 0.8, "reasoning long enough here one", v),
      cand("DEEPSEEK", 0.95, "reasoning long enough here two", v.map((x) => x + 0.001)),
      cand("LLAMA", 0.7, "reasoning long enough here three", undefined),
    ];
    const out = scoreCandidates(list);
    expect(out.every((c) => c.intentAlignmentScore === undefined)).toBe(true);
    expect(weightedScore(out[0])).toBeGreaterThanOrEqual(weightedScore(out[1]));
  });

  it("intentBlendRankKey matches score.ts weighting contract", () => {
    const c = cand("DEEPSEEK", 0.5, "x".repeat(20), undefined);
    const k = intentBlendRankKey(c, 1);
    expect(k).toBeGreaterThan(0);
    expect(k).toBeLessThanOrEqual(0.4);
  });
});
