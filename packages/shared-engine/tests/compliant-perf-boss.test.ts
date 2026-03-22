import { describe, expect, it } from "vitest";
import { runCompliantPerfBoss } from "../perf/compliant-perf-boss";

describe("compliant-perf-boss", () => {
  it("runs all checks and returns structured result", () => {
    const r = runCompliantPerfBoss({
      runId: "vitest_perf_boss",
      warnThresholdMs: 5000,
    });
    expect(r.runId).toBe("vitest_perf_boss");
    expect(r.checks.length).toBe(8);
    expect(r.checks.every((c) => c.ms >= 0 && Number.isFinite(c.ms))).toBe(true);
    expect(r.totalMs).toBeGreaterThanOrEqual(0);
    expect(r.warningCount).toBe(0);
  });

  it("flags warnings when threshold is impossibly low", () => {
    const r = runCompliantPerfBoss({
      runId: "vitest_perf_warn",
      warnThresholdMs: 0.0001,
    });
    expect(r.warningCount).toBeGreaterThan(0);
    expect(r.checks.some((c) => !c.withinBudget)).toBe(true);
  });
});
