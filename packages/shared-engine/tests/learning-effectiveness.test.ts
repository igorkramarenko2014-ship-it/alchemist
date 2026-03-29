import type { AICandidate, Panelist } from "@alchemist/shared-types";
import { describe, expect, it } from "vitest";
import { scoreCandidates, type LearningIndexLesson } from "../score";

function mk(panelist: Panelist, score: number, reasoning: string): AICandidate {
  const seed = panelist === "QWEN" ? 11 : 17;
  const v = Array.from({ length: 24 }, (_, i) => ((i * seed) % 97) / 100);
  return {
    state: {
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
    },
    score,
    reasoning,
    panelist,
    paramArray: v,
  };
}

const lessons: LearningIndexLesson[] = [
  {
    id: "l1",
    style: "lush ambient",
    character: "p",
    causalReasoning: "r",
    tags: ["pad"],
    mappingKeys: ["filter.cutoff"],
    fitnessScore: 0.7,
    fitnessConfidence: "medium",
    stalenessDays: 1,
  },
];

describe("learning influence — non-regression on survivor scores", () => {
  it("same multiset of panelist scores with vs without corpus rerank (ordering may differ)", () => {
    const prompt = "warm ambient pad with filter motion";
    const list = [mk("QWEN", 0.82, "pad wash stereo " + "x".repeat(20)), mk("LLAMA", 0.81, "pad wash stereo " + "y".repeat(20))];
    const base = scoreCandidates(list, prompt);
    const withCorpus = scoreCandidates(list, prompt, undefined, {
      corpusAffinityPrior: true,
      learningLessons: lessons,
    });
    const scores = (xs: AICandidate[]) => [...xs.map((c) => c.score)].sort((a, b) => b - a);
    expect(scores(withCorpus)).toEqual(scores(base));
    expect(withCorpus.length).toBe(base.length);
  });
});
