import { describe, expect, it } from "vitest";
import type { AICandidate, SerumState } from "@alchemist/shared-types";
import { MAX_CANDIDATES } from "../constants";
import {
  narrowTaxonomyPoolToTriadCandidates,
  TaxonomyPoolTooLargeError,
  TAXONOMY_PRE_SLAVIC_POOL_MAX,
} from "../taxonomy/engine";

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
  paramArray?: number[]
): AICandidate {
  return {
    state: emptyState(),
    score,
    reasoning: "Taxonomy engine test candidate with legible reasoning text.",
    panelist,
    ...(paramArray != null && { paramArray }),
  };
}

describe("taxonomy/engine — narrowTaxonomyPoolToTriadCandidates", () => {
  it("throws when pool exceeds TAXONOMY_PRE_SLAVIC_POOL_MAX", () => {
    const pool = Array.from({ length: TAXONOMY_PRE_SLAVIC_POOL_MAX + 1 }, (_, i) =>
      cand("LLAMA", 0.5 + i * 0.0001)
    );
    expect(() => narrowTaxonomyPoolToTriadCandidates(pool)).toThrow(
      TaxonomyPoolTooLargeError
    );
  });

  it("TaxonomyPoolTooLargeError exposes agent fusion lines", () => {
    const pool = Array.from({ length: TAXONOMY_PRE_SLAVIC_POOL_MAX + 1 }, (_, i) =>
      cand("LLAMA", 0.5 + i * 0.0001)
    );
    try {
      narrowTaxonomyPoolToTriadCandidates(pool);
      expect.fail("expected throw");
    } catch (e) {
      expect(e).toBeInstanceOf(TaxonomyPoolTooLargeError);
      const err = e as TaxonomyPoolTooLargeError;
      expect(err.fusionHintLines.length).toBeGreaterThan(0);
      expect(err.fusionHintLines[0]).toMatch(/^aji_fusion:/);
    }
  });

  it("returns at most MAX_CANDIDATES after scoreCandidates pipeline", () => {
    const spread = Array.from({ length: 32 }, (_, i) => ((i * 17) % 100) / 100);
    const pool: AICandidate[] = [];
    for (let i = 0; i < 12; i++) {
      pool.push(
        cand(i % 2 === 0 ? "DEEPSEEK" : "LLAMA", 0.5 + i * 0.01, [...spread])
      );
    }
    const out = narrowTaxonomyPoolToTriadCandidates(pool);
    expect(out.length).toBeLessThanOrEqual(MAX_CANDIDATES);
    expect(out.length).toBeGreaterThan(0);
  });

  it("accepts empty pool", () => {
    expect(narrowTaxonomyPoolToTriadCandidates([])).toEqual([]);
  });

  it("accepts optional options.prompt (reserved; behavior unchanged)", () => {
    const pool = [cand("DEEPSEEK", 0.9)];
    const a = narrowTaxonomyPoolToTriadCandidates(pool);
    const b = narrowTaxonomyPoolToTriadCandidates(pool, { prompt: "bass lead" });
    expect(b).toEqual(a);
  });

  it("oversizeKeywordFallback narrows with prompt instead of throwing", () => {
    const pool = Array.from({ length: TAXONOMY_PRE_SLAVIC_POOL_MAX + 1 }, (_, i) =>
      cand("LLAMA", 0.5 + i * 0.0001, undefined),
    );
    pool[0] = {
      ...pool[0]!,
      reasoning: "warm analog bass patch for low end",
    };
    const out = narrowTaxonomyPoolToTriadCandidates(pool, {
      prompt: "bass",
      oversizeKeywordFallback: true,
    });
    expect(out.length).toBeGreaterThan(0);
    expect(out.length).toBeLessThanOrEqual(MAX_CANDIDATES);
  });
});
