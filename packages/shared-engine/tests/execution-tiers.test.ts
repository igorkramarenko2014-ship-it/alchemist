import { describe, expect, it } from "vitest";
import {
  assertNoAdvisoryMutationBridge,
  getExecutionTier,
  isAdvisoryOnlyCell,
  summarizeExecutionTiers,
} from "../execution-tiers";

describe("execution tier registry", () => {
  it("classifies canonical cells into expected tiers", () => {
    expect(getExecutionTier("triad")).toBe("tier1_hot_path");
    expect(getExecutionTier("prompt_guard")).toBe("tier1_hot_path");
    expect(getExecutionTier("tablebase")).toBe("tier1_hot_path");
    expect(getExecutionTier("integrity")).toBe("tier1_hot_path");
    expect(getExecutionTier("arbitration")).toBe("tier3_advisory");
    expect(getExecutionTier("schism")).toBe("tier3_advisory");
  });

  it("marks advisory-only cells clearly", () => {
    expect(isAdvisoryOnlyCell("soe")).toBe(true);
    expect(isAdvisoryOnlyCell("triad")).toBe(false);
  });

  it("blocks advisory -> tier1 mutation bridges by default", () => {
    expect(() => assertNoAdvisoryMutationBridge("schism", "triad")).toThrow(
      /Tier policy violation/i,
    );
  });

  it("summarizes tiers with stable non-empty groups", () => {
    const s = summarizeExecutionTiers();
    expect(s.tier1.length).toBeGreaterThan(0);
    expect(s.tier2.length).toBeGreaterThan(0);
    expect(s.tier3.length).toBeGreaterThan(0);
  });
});

