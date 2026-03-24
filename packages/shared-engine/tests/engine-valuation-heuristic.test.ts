import { describe, expect, it } from "vitest";
import {
  computeEngineValuationHeuristic,
  ENGINE_VALUATION_HEURISTIC_VERSION,
} from "../engine-valuation-heuristic";

describe("computeEngineValuationHeuristic", () => {
  it("is deterministic for fixed metrics", () => {
    const m = {
      totalLines: 8000,
      totalFiles: 70,
      linesTest: 2000,
      linesGen: 200,
      linesSrc: 5800,
      testFileCount: 25,
      byPackage: {
        sharedEngine: {
          files: 64,
          lines: 7000,
          linesTest: 2000,
          linesGen: 200,
          linesSrc: 4800,
        },
        fxpEncoder: { files: 6, lines: 1000, linesTest: 0, linesGen: 0, linesSrc: 1000 },
      },
    };
    const a = computeEngineValuationHeuristic(m);
    const b = computeEngineValuationHeuristic(m);
    expect(a).toEqual(b);
    expect(a.heuristicVersion).toBe(ENGINE_VALUATION_HEURISTIC_VERSION);
    expect(a.philosophyNote).toContain("not professional valuation");
    expect(a.replacementCostUsdMid).toBeGreaterThan(0);
    expect(a.operatorLine).toContain("8000 LOC");
    expect(a.nonExclusiveLicenseYear1UsdBand[0]).toBeLessThanOrEqual(
      a.nonExclusiveLicenseYear1UsdBand[1]!,
    );
  });
});
