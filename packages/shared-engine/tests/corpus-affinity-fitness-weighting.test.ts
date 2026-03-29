import type { AICandidate, Panelist } from "@alchemist/shared-types";
import { describe, expect, it } from "vitest";
import {
  computeCorpusAffinity,
  lessonEffectiveAffinityWeight,
  type LearningIndexLesson,
} from "../learning/compute-corpus-affinity";

function cand(panelist: Panelist, score: number, reasoning: string): AICandidate {
  return {
    state: {
      meta: {},
      master: {},
      oscA: { level: 0.5 },
      oscB: {},
      noise: {},
      filter: { cutoff: 0.3 },
      envelopes: [],
      lfos: [],
      fx: {},
      matrix: [],
    } as AICandidate["state"],
    score,
    reasoning,
    panelist,
  };
}

const baseLesson: LearningIndexLesson = {
  id: "fit",
  style: "dark bass",
  character: "x",
  causalReasoning: "y",
  tags: ["reese"],
  mappingKeys: ["filter.cutoff", "oscA.level"],
};

describe("lessonEffectiveAffinityWeight + corpus affinity", () => {
  it("higher fitness with high confidence yields stronger bounded weight than low confidence", () => {
    const hi: LearningIndexLesson = {
      ...baseLesson,
      fitnessScore: 0.95,
      fitnessConfidence: "high",
      stalenessDays: 2,
    };
    const lo: LearningIndexLesson = {
      ...baseLesson,
      fitnessScore: 0.95,
      fitnessConfidence: "low",
      stalenessDays: 2,
    };
    expect(lessonEffectiveAffinityWeight(hi)).toBeGreaterThan(lessonEffectiveAffinityWeight(lo));
    expect(lessonEffectiveAffinityWeight(hi)).toBeLessThanOrEqual(0.15);
    expect(lessonEffectiveAffinityWeight(lo)).toBeGreaterThanOrEqual(0.05);
  });

  it("staleness > 14 reduces weight vs fresh row", () => {
    const fresh: LearningIndexLesson = {
      ...baseLesson,
      fitnessScore: 0.8,
      fitnessConfidence: "high",
      stalenessDays: 2,
    };
    const stale: LearningIndexLesson = {
      ...baseLesson,
      fitnessScore: 0.8,
      fitnessConfidence: "high",
      stalenessDays: 100,
    };
    expect(lessonEffectiveAffinityWeight(fresh)).toBeGreaterThan(lessonEffectiveAffinityWeight(stale));
  });

  it("higher fitness does not invert ordering when base affinity equal — stronger weight increases scaled affinity", () => {
    const c = cand("LLAMA", 0.5, "reese bass growl " + "x".repeat(12));
    const hiFit: LearningIndexLesson = { ...baseLesson, fitnessScore: 0.99, fitnessConfidence: "high" };
    const loFit: LearningIndexLesson = { ...baseLesson, fitnessScore: 0.2, fitnessConfidence: "low" };
    expect(computeCorpusAffinity(c, [hiFit])).toBeGreaterThanOrEqual(computeCorpusAffinity(c, [loFit]));
  });
});
