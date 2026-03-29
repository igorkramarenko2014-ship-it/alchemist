import { describe, expect, it } from "vitest";
import type { AICandidate, Panelist } from "@alchemist/shared-types";
import {
  computeCorpusAffinity,
  collectLeafParamPaths,
  pathMatchesMappingKey,
  type LearningIndexLesson,
} from "../learning/compute-corpus-affinity";
import {
  cosineSimilarityParamArrays,
  scoreCandidates,
  SLAVIC_FILTER_COSINE_THRESHOLD,
  SLAVIC_TEXT_DICE_THRESHOLD,
} from "../score";

function cand(
  panelist: Panelist,
  score: number,
  reasoning: string,
  extra?: Partial<AICandidate>,
): AICandidate {
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
    ...extra,
  };
}

const baseLessons: LearningIndexLesson[] = [
  {
    id: "l1",
    style: "dark bass",
    character: "x",
    causalReasoning: "y",
    tags: ["reese", "growl"],
    mappingKeys: ["filter.cutoff", "oscA.level"],
  },
];

describe("computeCorpusAffinity", () => {
  it("returns 0 for empty lessons", () => {
    expect(computeCorpusAffinity(cand("LLAMA", 0.5, "a".repeat(20)), [])).toBe(0);
  });

  it("returns 0 when no mappingKeys overlap state paths", () => {
    const c = cand("LLAMA", 0.5, "unrelated text here ok");
    expect(computeCorpusAffinity(c, baseLessons)).toBe(0);
  });

  it("returns > 0 when state leaf paths match lesson mappingKeys", () => {
    const c: AICandidate = {
      ...cand("LLAMA", 0.5, "reese bass growl patch here ok"),
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
    };
    const a = computeCorpusAffinity(c, baseLessons);
    expect(a).toBeGreaterThan(0);
    expect(a).toBeLessThanOrEqual(1);
  });

  it("never exceeds 1.0", () => {
    const c = cand("LLAMA", 1, "dark bass reese growl " + "x".repeat(30), {
      description: "dark bass reese growl",
    });
    expect(computeCorpusAffinity(c, baseLessons)).toBeLessThanOrEqual(1);
  });

  it("never throws on malformed candidate", () => {
    expect(() =>
      computeCorpusAffinity({} as AICandidate, baseLessons),
    ).not.toThrow();
    expect(computeCorpusAffinity({} as AICandidate, baseLessons)).toBe(0);
  });
});

describe("scoreCandidates + corpusAffinityPrior", () => {
  it("corpusAffinityPrior false matches omitting corpus options (order)", () => {
    const v = Array.from({ length: 24 }, (_, i) => ((i * 11) % 97) / 100);
    const list = [
      cand("QWEN", 0.8, "reasoning long enough here one", { paramArray: v }),
      cand("DEEPSEEK", 0.75, "reasoning long enough here two", {
        paramArray: v.map((x) => x + 0.05),
      }),
    ];
    const a = scoreCandidates(list, "");
    const b = scoreCandidates(list, "", undefined, {
      corpusAffinityPrior: false,
      learningLessons: baseLessons,
    });
    expect(a.map((x) => x.panelist)).toEqual(b.map((x) => x.panelist));
  });

  it("corpusAffinityPrior true can re-rank equal base score toward corpus-aligned reasoning", () => {
    const lessons: LearningIndexLesson[] = [
      {
        id: "pad",
        style: "lush ambient",
        character: "p",
        causalReasoning: "r",
        tags: ["pad", "wash"],
        mappingKeys: ["meta.version"],
      },
    ];
    const stateWithMeta = {
      meta: { version: 1 },
      master: {},
      oscA: {},
      oscB: {},
      noise: {},
      filter: {},
      envelopes: [],
      lfos: [],
      fx: {},
      matrix: [],
    } as AICandidate["state"];
    const highAff = cand("LLAMA", 0.5, "lush ambient pad wash stereo field " + "x".repeat(10), {
      state: stateWithMeta,
    });
    const lowAff = cand("QWEN", 0.5, "sharp pluck transient click transient " + "x".repeat(10));
    const out = scoreCandidates([lowAff, highAff], "", undefined, {
      corpusAffinityPrior: true,
      learningLessons: lessons,
      corpusAffinityWeight: 0.4,
    });
    expect(out[0].reasoning).toContain("lush");
  });

  it("does not resurrect candidates removed by Slavic dedupe", () => {
    const v = Array.from({ length: 128 }, (_, i) => ((i * 13) % 100) / 100);
    const a = cand("LLAMA", 0.9, "same params reasoning text here one two", { paramArray: v });
    const b = cand("QWEN", 0.85, "same params reasoning text here one two", { paramArray: v });
    expect(cosineSimilarityParamArrays(v, v)).toBeGreaterThan(SLAVIC_FILTER_COSINE_THRESHOLD);
    const out = scoreCandidates([a, b], "test prompt for dice legibility", undefined, {
      corpusAffinityPrior: true,
      learningLessons: baseLessons,
    });
    expect(out.length).toBe(1);
  });
});

describe("Slavic thresholds unchanged (Phase 3 regression guard)", () => {
  it("exports canonical cosine and Dice floors (see gates.ts DEFAULT + score.ts)", () => {
    expect(SLAVIC_FILTER_COSINE_THRESHOLD).toBe(0.85);
    expect(SLAVIC_TEXT_DICE_THRESHOLD).toBe(0.75);
  });
});

describe("collectLeafParamPaths", () => {
  it("finds nested paths", () => {
    const paths = collectLeafParamPaths({ a: { b: { c: 1 } } });
    expect(paths).toContain("a.b.c");
  });
});

describe("pathMatchesMappingKey (Phase 3 flexible match)", () => {
  it("matches exact and segment-style keys", () => {
    expect(pathMatchesMappingKey("filter.cutoff", "filter.cutoff")).toBe(true);
    expect(pathMatchesMappingKey("filter.cutoff", "cutoff")).toBe(true);
    expect(pathMatchesMappingKey("oscA.level", "level")).toBe(true);
    expect(pathMatchesMappingKey("meta.x", "unrelated")).toBe(false);
  });
});

describe("priorityMappingKeys in corpus affinity", () => {
  it("uses priority keys when present (index row shape)", () => {
    const lesson: LearningIndexLesson = {
      id: "p",
      style: "test",
      character: "c",
      causalReasoning: "r",
      tags: [],
      mappingKeys: ["filter.cutoff", "oscA.level", "meta.version"],
      priorityMappingKeys: ["filter.cutoff"],
    };
    const c: AICandidate = {
      ...cand("LLAMA", 0.5, "reasoning text here long enough ok"),
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
    };
    const withPri = computeCorpusAffinity(c, [lesson]);
    const withoutPri = computeCorpusAffinity(c, [{ ...lesson, priorityMappingKeys: undefined }]);
    expect(withPri).toBeGreaterThanOrEqual(withoutPri);
  });
});
