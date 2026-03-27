import { describe, expect, it } from "vitest";
import type { AICandidate } from "@alchemist/shared-types";
import {
  __resetTriadConstraintInjectionStateForTests,
  buildContrastConstraint,
  buildTriadPromptWithContrastConstraint,
  inferDominantCharacteristic,
  recordTriadConstraintFeedback,
} from "../triad-constraint-injection";

function candidate(reasoning: string, mean = 0.7): AICandidate {
  return {
    panelist: "DEEPSEEK",
    score: 0.9,
    reasoning,
    state: {} as AICandidate["state"],
    paramArray: Array.from({ length: 16 }, () => mean),
  };
}

describe("triad constraint injection", () => {
  it("returns empty constraint when no previous candidate", () => {
    __resetTriadConstraintInjectionStateForTests();
    expect(buildContrastConstraint(null)).toBe("");
  });

  it("appends contrast constraint when drop rate is high", () => {
    __resetTriadConstraintInjectionStateForTests();
    recordTriadConstraintFeedback(candidate("harmonic stacking and clean interval architecture"), 0.7);
    const out = buildTriadPromptWithContrastConstraint("base prompt", "LLAMA");
    expect(out.applied).toBe(true);
    expect(out.prompt).toContain("base prompt");
    expect(out.prompt).toContain("AIOM_CONTRAST_CONSTRAINT");
  });

  it("infers dominant characteristic deterministically", () => {
    const s = inferDominantCharacteristic(candidate("aggressive LFO modulation with movement"));
    expect(s).toContain("LFO modulation");
  });
});
