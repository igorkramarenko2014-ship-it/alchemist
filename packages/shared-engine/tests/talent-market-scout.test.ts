import { describe, expect, it, vi } from "vitest";
import {
  analyzeTalentMarket,
  getDefaultMarketBenchmarks,
  logTalentMarketAnalysis,
  parseMarketBenchmarksDocument,
} from "../talent/market-scout";

describe("talent market scout", () => {
  const miniDoc = parseMarketBenchmarksDocument({
    meta: { disclaimer: "test" },
    talents: [
      {
        id: "t-strong",
        displayName: "Strong",
        comparativeScore: 0.95,
        competesWithPanelist: "QWEN",
      },
      {
        id: "t-mid",
        displayName: "Mid",
        comparativeScore: 0.7,
        competesWithPanelist: "LLAMA",
      },
    ],
  });

  it("getDefaultMarketBenchmarks loads bundled JSON", () => {
    const d = getDefaultMarketBenchmarks();
    expect(d.talents.length).toBeGreaterThanOrEqual(3);
    expect(d.meta?.disclaimer).toBeDefined();
  });

  it("returns insufficient data when no health signals", () => {
    const r = analyzeTalentMarket({ benchmarks: miniDoc });
    expect(r.operatorReviewSuggested).toBe(false);
    expect(r.reason).toMatch(/Insufficient data/);
  });

  it("flags operator review when gap >= default threshold (panelist path)", () => {
    const r = analyzeTalentMarket({
      benchmarks: miniDoc,
      panelistHealth: { LLAMA: 0.5, DEEPSEEK: 0.9, QWEN: 0.9 },
      marketGapThreshold: 0.15,
    });
    expect(r.weakestPanelist).toBe("LLAMA");
    expect(r.gap).toBeCloseTo(0.95 - 0.5, 5);
    expect(r.operatorReviewSuggested).toBe(true);
    expect(r.suggestedMarketTalent?.id).toBe("t-mid");
  });

  it("aggregate triad path uses triadHealthScore when no panelist map", () => {
    const r = analyzeTalentMarket({
      benchmarks: miniDoc,
      triadHealthScore: 0.5,
      marketGapThreshold: 0.15,
    });
    expect(r.weakestPanelist).toBeNull();
    expect(r.weakestScore).toBe(0.5);
    expect(r.operatorReviewSuggested).toBe(true);
  });

  it("no flag when gap below threshold", () => {
    const r = analyzeTalentMarket({
      benchmarks: miniDoc,
      panelistHealth: { LLAMA: 0.88, DEEPSEEK: 0.9, QWEN: 0.87 },
      marketGapThreshold: 0.15,
    });
    expect(r.operatorReviewSuggested).toBe(false);
  });

  it("parseMarketBenchmarksDocument throws on bad root", () => {
    expect(() => parseMarketBenchmarksDocument(null)).toThrow();
    expect(() => parseMarketBenchmarksDocument({ talents: [] })).toThrow();
  });

  it("logTalentMarketAnalysis emits talent_market_analysis", () => {
    const spy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const r = analyzeTalentMarket({
      benchmarks: miniDoc,
      triadHealthScore: 0.5,
    });
    logTalentMarketAnalysis(r, "run_test");
    const line = spy.mock.calls.map((c) => String(c[0])).join("");
    spy.mockRestore();
    expect(line).toContain('"event":"talent_market_analysis"');
    expect(line).toContain("run_test");
    expect(line).toContain("operatorReviewSuggested");
  });
});
