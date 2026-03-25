import { describe, expect, it } from "vitest";
import type { AICandidate, SerumState } from "@alchemist/shared-types";
import { MAX_CANDIDATES } from "../constants";
import { TAXONOMY_PRE_SLAVIC_POOL_MAX } from "../taxonomy/engine";
import {
  filterTaxonomyByPromptKeywords,
  rankTaxonomy,
  TAXONOMY_KEYWORD_SPARSE_MAX,
} from "../taxonomy/sparse-rank";

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

function cand(
  panelist: AICandidate["panelist"],
  score: number,
  reasoning: string,
  paramArray?: number[]
): AICandidate {
  return {
    state: emptyState(),
    score,
    reasoning,
    panelist,
    ...(paramArray != null && { paramArray }),
  };
}

describe("taxonomy/sparse-rank", () => {
  it("filterTaxonomyByPromptKeywords ranks higher multi-token hits first (deterministic)", () => {
    const pool = [
      cand("LLAMA", 0.5, "bass only one keyword in reasoning text here."),
      cand("QWEN", 0.5, "bass wobble texture keyword rich reasoning text here."),
    ];
    const out = filterTaxonomyByPromptKeywords("bass texture", pool);
    expect(out.length).toBeGreaterThanOrEqual(1);
    expect(out[0]?.reasoning).toContain("rich");
  });

  it("filterTaxonomyByPromptKeywords matches reasoning tokens", () => {
    const pool = [
      cand("LLAMA", 0.5, "dark bass rumble — legible taxonomy filter test reasoning."),
      cand("DEEPSEEK", 0.6, "bright pluck lead — legible taxonomy filter test reasoning."),
      cand("QWEN", 0.7, "sub kick drum — legible taxonomy filter test reasoning."),
    ];
    const out = filterTaxonomyByPromptKeywords("bass lead", pool);
    expect(out.map((c) => c.reasoning)).toEqual([
      "dark bass rumble — legible taxonomy filter test reasoning.",
      "bright pluck lead — legible taxonomy filter test reasoning.",
    ]);
  });

  it("filterTaxonomyByPromptKeywords caps at TAXONOMY_KEYWORD_SPARSE_MAX", () => {
    const pool = Array.from({ length: 500 }, (_, i) =>
      cand("LLAMA", 0.5, `keyword token-${i} — taxonomy sparse rank test suffix padding.`)
    );
    const out = filterTaxonomyByPromptKeywords("token", pool);
    expect(out.length).toBe(TAXONOMY_KEYWORD_SPARSE_MAX);
    expect(TAXONOMY_KEYWORD_SPARSE_MAX).toBe(TAXONOMY_PRE_SLAVIC_POOL_MAX);
  });

  it("rankTaxonomy returns at most MAX_CANDIDATES", () => {
    const pool: AICandidate[] = [];
    const spread = Array.from({ length: 32 }, (_, i) => ((i * 17) % 100) / 100);
    for (let i = 0; i < 80; i++) {
      pool.push(
        cand(
          i % 2 === 0 ? "DEEPSEEK" : "LLAMA",
          0.5 + i * 0.001,
          `pad texture wide ${i} — legible rankTaxonomy pool reasoning.`,
          [...spread]
        )
      );
    }
    const out = rankTaxonomy("texture pad", pool);
    expect(out.length).toBeLessThanOrEqual(MAX_CANDIDATES);
  });
});
