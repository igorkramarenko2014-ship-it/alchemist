import { describe, expect, it } from "vitest";
import {
  buildPresetQualityReport,
  PRESET_QUALITY_EVAL_CASES,
} from "../learning/preset-quality";

describe("preset quality report", () => {
  it("keeps priors within the non-regression floor and shows at least one improvement", () => {
    const report = buildPresetQualityReport(PRESET_QUALITY_EVAL_CASES, {
      generatedAtUtc: "2026-03-30T00:00:00.000Z",
    });

    expect(report.promptCount).toBeGreaterThan(0);
    for (const row of report.comparisons) {
      expect(row.scoreWithPriors).toBeGreaterThanOrEqual(row.scoreWithoutPriors * 0.98);
      expect(row.nonRegression).toBe(true);
    }
    expect(report.summary.improvedRate).toBeGreaterThan(0);
    expect(report.summary.nonRegressionRate).toBe(1);
  });
});
