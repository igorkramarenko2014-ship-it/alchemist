import { describe, expect, it, vi } from "vitest";
import type { AICandidate, SerumState } from "@alchemist/shared-types";
import * as telemetry from "../telemetry";
import { narrowTaxonomyPoolToTriadCandidates, TAXONOMY_PRE_SLAVIC_POOL_MAX } from "../taxonomy/engine";
import { safeProcessTaxonomy } from "../taxonomy/safe-process";

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
): AICandidate {
  return {
    state: emptyState(),
    score,
    reasoning,
    panelist,
  };
}

describe("safeProcessTaxonomy", () => {
  it("direct mode at 200 rows", () => {
    const pool = Array.from({ length: 200 }, (_, i) =>
      cand("LLAMA", 0.5 + i * 0.0001, `row ${i} taxonomy safe process legible reasoning text here.`),
    );
    const r = safeProcessTaxonomy("pad", pool);
    expect(r.taxonomyMode).toBe("direct");
    expect(r.fallbackUsed).toBe(false);
    expect(r.taxonomySize).toBe(200);
    expect(r.candidates.length).toBeGreaterThan(0);
  });

  it("ranked mode at 201 rows", () => {
    const pool = Array.from({ length: 201 }, (_, i) =>
      cand("LLAMA", 0.5 + i * 0.0001, `texture wide pad row ${i} — legible rankTaxonomy pool reasoning.`),
    );
    const r = safeProcessTaxonomy("texture pad", pool);
    expect(r.taxonomyMode).toBe("ranked");
    expect(r.fallbackUsed).toBe(true);
    expect(r.taxonomySize).toBe(201);
    expect(r.candidates.length).toBeGreaterThan(0);
  });

  it("borderline 199 direct, 201 ranked", () => {
    const mk = (n: number) =>
      Array.from({ length: n }, (_, i) =>
        cand("QWEN", 0.6, `keyword bass line ${i} for border taxonomy test reasoning text.`),
      );
    const a = safeProcessTaxonomy("bass", mk(199));
    expect(a.taxonomyMode).toBe("direct");
    const b = safeProcessTaxonomy("bass", mk(201));
    expect(b.taxonomyMode).toBe("ranked");
  });

  it("narrow throws on 201 without safe entry", () => {
    const pool = Array.from({ length: 201 }, (_, i) =>
      cand("LLAMA", 0.5, `taxonomy row ${i} legible pad reasoning text.`),
    );
    expect(() => narrowTaxonomyPoolToTriadCandidates(pool)).toThrow();
  });

  it("logs taxonomy_safe_process with taxonomySize", () => {
    const logSpy = vi.spyOn(telemetry, "logEvent").mockImplementation(() => {});
    safeProcessTaxonomy("pad", [cand("LLAMA", 0.5, "single taxonomy row legible reasoning.")]);
    expect(logSpy).toHaveBeenCalledWith(
      "taxonomy_safe_process",
      expect.objectContaining({
        taxonomyMode: "direct",
        taxonomySize: 1,
        fallbackUsed: false,
        cap: TAXONOMY_PRE_SLAVIC_POOL_MAX,
      }),
    );
    logSpy.mockRestore();
  });

  it("adversarial whitespace-only prompt on large pool uses deterministic first-200 slice via rankTaxonomy", () => {
    const pool = Array.from({ length: 250 }, (_, i) =>
      cand("DEEPSEEK", 0.55, `silent row ${i} taxonomy adversarial reasoning filler text.`),
    );
    const r = safeProcessTaxonomy("   ", pool);
    expect(r.taxonomyMode).toBe("ranked");
    expect(r.candidates.length).toBeGreaterThan(0);
  });
});
