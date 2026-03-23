import { afterEach, describe, expect, it } from "vitest";
import {
  getIntegrityHealthSnapshot,
  logDegradedFallback,
  logHonestCapabilityGap,
  logIntegrityEvent,
  logSprintComplete,
  resetIntegrityMetricsForTests,
} from "../integrity";

afterEach(() => {
  resetIntegrityMetricsForTests();
});

describe("integrity signals", () => {
  it("logIntegrityEvent does not throw", () => {
    expect(() =>
      logIntegrityEvent({ outcome: "sprint_complete", module: "test" })
    ).not.toThrow();
  });

  it("bumps counters per outcome", () => {
    expect(getIntegrityHealthSnapshot()).toEqual({
      honestCapabilityGaps: 0,
      sprintCompletions: 0,
      degradedFallbacks: 0,
    });

    logHonestCapabilityGap("missing_offset_map", { module: "fxp" });
    logSprintComplete("verify:harsh");
    logDegradedFallback("temporal_retry", { rawCount: 3 });
    logIntegrityEvent({ outcome: "honest_capability_gap", reason: "x" });

    expect(getIntegrityHealthSnapshot()).toEqual({
      honestCapabilityGaps: 2,
      sprintCompletions: 1,
      degradedFallbacks: 1,
    });
  });
});
