import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { AICandidate, Panelist } from "@alchemist/shared-types";
import { describe, expect, it } from "vitest";
import {
  computeCorpusAffinity,
  lessonEffectiveAffinityWeight,
  type LearningIndexLesson,
} from "../learning/compute-corpus-affinity";
import { isValidCandidate } from "../validate";
import { scoreCandidates } from "../score";

function findMonorepoRoot(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 18; i += 1) {
    const pj = join(dir, "package.json");
    if (existsSync(pj)) {
      try {
        const j = JSON.parse(readFileSync(pj, "utf8")) as { name?: string; workspaces?: unknown };
        if (j.name === "alchemist" && Array.isArray(j.workspaces)) return dir;
      } catch {
        /* continue */
      }
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error("monorepo root not found from test file");
}

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
    const list = [
      mk("QWEN", 0.82, "pad wash stereo " + "x".repeat(20)),
      mk("LLAMA", 0.81, "pad wash stereo " + "y".repeat(20)),
    ];
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

describe("learning improves or is neutral vs baseline", () => {
  it("corpus affinity does not turn invalid candidates into valid ones", () => {
    const bad: AICandidate = {
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
      score: 0.5,
      reasoning: "",
      panelist: "LLAMA",
    };
    expect(isValidCandidate(bad)).toBe(false);
    const withCorpus = scoreCandidates([bad], "test", undefined, {
      corpusAffinityPrior: true,
      learningLessons: lessons,
    });
    // Gate path drops invalid survivors — corpus affinity cannot surface them.
    expect(withCorpus.length).toBe(0);
  });

  it("high fitness + high confidence yields higher effectiveWeight than low fitness + low confidence", () => {
    const base: LearningIndexLesson = {
      id: "x",
      style: "s",
      character: "c",
      causalReasoning: "r",
      tags: ["t"],
      mappingKeys: ["filter.cutoff"],
    };
    const highFitness: LearningIndexLesson = {
      ...base,
      fitnessScore: 0.9,
      fitnessConfidence: "high",
      stalenessDays: 1,
    };
    const lowFitness: LearningIndexLesson = {
      ...base,
      fitnessScore: 0.1,
      fitnessConfidence: "low",
      stalenessDays: 1,
    };
    expect(lessonEffectiveAffinityWeight(highFitness)).toBeGreaterThan(
      lessonEffectiveAffinityWeight(lowFitness),
    );
  });

  it("computeCorpusAffinity stays bounded (advisory rerank input)", () => {
    const c = mk("LLAMA", 0.6, "pad wash stereo " + "z".repeat(24));
    const lesson: LearningIndexLesson = {
      id: "l1",
      style: "lush ambient",
      character: "p",
      causalReasoning: "r",
      tags: ["pad"],
      mappingKeys: ["filter.cutoff", "oscA.level"],
      fitnessScore: 0.99,
      fitnessConfidence: "high",
      stalenessDays: 1,
    };
    const aff = computeCorpusAffinity(c, [lesson]);
    expect(aff).toBeGreaterThanOrEqual(0);
    expect(aff).toBeLessThanOrEqual(1);
  });

  it("truth matrix learningOutcomes stays non-authoritative", () => {
    const root = findMonorepoRoot();
    const p = join(root, "artifacts", "truth-matrix.json");
    if (!existsSync(p)) {
      expect(true).toBe(true);
      return;
    }
    const j = JSON.parse(readFileSync(p, "utf8")) as {
      learningOutcomes?: { authoritative?: boolean };
    };
    expect(j.learningOutcomes?.authoritative).toBe(false);
  });
});
