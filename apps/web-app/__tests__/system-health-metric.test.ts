import { describe, expect, it } from "vitest";
import { computePercentileFromScores } from "@/lib/system-health-metric";

describe("system-health-metric", () => {
  it("computes empirical percentile (P(X<=current))", () => {
    const scores = [1, 2, 2, 3];
    expect(computePercentileFromScores(scores, 1)).toBe(25);
    expect(computePercentileFromScores(scores, 2)).toBe(75);
    expect(computePercentileFromScores(scores, 2.5)).toBe(75);
    expect(computePercentileFromScores(scores, 3)).toBe(100);
  });

  it("returns null when scores empty or current not finite", () => {
    expect(computePercentileFromScores([], 1)).toBeNull();
    expect(computePercentileFromScores([1, 2, 3], Number.NaN)).toBeNull();
  });
});

