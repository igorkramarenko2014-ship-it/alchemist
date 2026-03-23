import { afterEach, describe, expect, it } from "vitest";
import { getIntegrityHealthSnapshot, resetIntegrityMetricsForTests } from "../integrity";
import {
  computeExistentialWeight,
  concludeModuleSprint,
  Polarity,
  SCHISM_DEFAULT_GROWTH_THRESHOLD,
  SCHISM_MODULE_GATEKEEPER,
  triggerGatekeeperSchism,
  triggerSchism,
} from "../schism";

afterEach(() => {
  resetIntegrityMetricsForTests();
});

describe("triggerSchism", () => {
  it("chooses CONSOLIDATE when growth is below threshold", () => {
    const c = triggerSchism({
      moduleName: SCHISM_MODULE_GATEKEEPER,
      growthLevel: 2,
    });
    expect(c.chosen).toBe(Polarity.CONSOLIDATE);
    expect(c.split[Polarity.CONSOLIDATE]).toContain("Consolidator");
    expect(c.split[Polarity.DISRUPT]).toContain("Disruptor");
  });

  it("chooses DISRUPT when growth is at or above threshold", () => {
    const c = triggerSchism({
      moduleName: SCHISM_MODULE_GATEKEEPER,
      growthLevel: 6,
    });
    expect(c.chosen).toBe(Polarity.DISRUPT);
  });

  it("respects custom growthThreshold", () => {
    const low = triggerSchism({
      moduleName: "taxonomy",
      growthLevel: 4,
      growthThreshold: 8,
    });
    expect(low.chosen).toBe(Polarity.CONSOLIDATE);
    const high = triggerSchism({
      moduleName: "taxonomy",
      growthLevel: 4,
      growthThreshold: 3,
    });
    expect(high.chosen).toBe(Polarity.DISRUPT);
  });

  it("clamps growth and uses gatekeeper-specific copy", () => {
    const c = triggerGatekeeperSchism(99);
    expect(c.growthLevel).toBe(10);
    expect(c.growthThreshold).toBe(SCHISM_DEFAULT_GROWTH_THRESHOLD);
    expect(c.split[Polarity.CONSOLIDATE]).toMatch(/IQR|telemetry/i);
  });
});

describe("computeExistentialWeight", () => {
  it("peaks at the threshold (hard fork)", () => {
    const t = SCHISM_DEFAULT_GROWTH_THRESHOLD;
    const at = computeExistentialWeight(t, t);
    const far = computeExistentialWeight(t + 5, t);
    expect(at).toBeGreaterThan(far);
    expect(at).toBe(1);
  });
});

describe("concludeModuleSprint", () => {
  it("returns choice and bumps sprint integrity counter", () => {
    const before = getIntegrityHealthSnapshot().sprintCompletions;
    const c = concludeModuleSprint({
      moduleName: "gatekeeper",
      growthLevel: 1,
    });
    expect(c.chosen).toBe(Polarity.CONSOLIDATE);
    expect(getIntegrityHealthSnapshot().sprintCompletions).toBe(before + 1);
  });
});
