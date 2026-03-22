import { describe, expect, it } from "vitest";
import { PANELIST_WEIGHTS } from "../constants";
import { newTriadRunId } from "../triad-monitor";
import { runTriad } from "../triad";
import { validatePromptForTriad } from "../prompt-guard";
import {
  ADVERSARIAL_ENTROPY_MIN,
  ADVERSARIAL_VARIANCE_MIN,
  candidatePassesAdversarial,
  entropyParamArray,
  passesAdversarialSanity,
  varianceParamArray,
} from "../validate";
import type { AICandidate, SerumState } from "@alchemist/shared-types";

function emptySerumState(): SerumState {
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

describe("panelist weights", () => {
  it("sums to 1", () => {
    const s = Object.values(PANELIST_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(s).toBeCloseTo(1, 5);
  });
});

describe("prompt guard", () => {
  it("rejects code fences", () => {
    expect(validatePromptForTriad("hello ```\ncode\n```").ok === false).toBe(true);
  });
  it("rejects too long", () => {
    expect(validatePromptForTriad("x".repeat(3000)).ok === false).toBe(true);
  });
  it("accepts normal prompt", () => {
    expect(validatePromptForTriad("dark reese bass").ok === true).toBe(true);
  });
});

describe("adversarial sanity", () => {
  it("flat array fails variance", () => {
    const flat = Array.from({ length: 32 }, () => 0.5);
    expect(varianceParamArray(flat)).toBeLessThan(ADVERSARIAL_VARIANCE_MIN);
    expect(passesAdversarialSanity(flat)).toBe(false);
  });

  it("spread array passes", () => {
    const spread = Array.from({ length: 32 }, (_, i) => (i % 10) / 10);
    expect(varianceParamArray(spread)).toBeGreaterThanOrEqual(ADVERSARIAL_VARIANCE_MIN);
    expect(entropyParamArray(spread)).toBeGreaterThanOrEqual(ADVERSARIAL_ENTROPY_MIN);
    expect(passesAdversarialSanity(spread)).toBe(true);
  });

  it("candidate without paramArray passes adversarial gate", () => {
    const c: AICandidate = {
      state: emptySerumState(),
      score: 0.5,
      reasoning: "Legible stub reasoning for adversarial gate coverage in Vitest.",
      panelist: "LLAMA",
    };
    expect(candidatePassesAdversarial(c)).toBe(true);
  });

  it("candidate with degenerate paramArray fails", () => {
    const c: AICandidate = {
      state: emptySerumState(),
      score: 0.5,
      reasoning: "Legible stub reasoning for adversarial gate coverage in Vitest.",
      panelist: "DEEPSEEK",
      paramArray: Array.from({ length: 32 }, () => 0.5),
    };
    expect(candidatePassesAdversarial(c)).toBe(false);
  });
});

describe("triad monitor", () => {
  it("newTriadRunId is unique-shaped", () => {
    const a = newTriadRunId();
    const b = newTriadRunId();
    expect(a).toMatch(/^triad_/);
    expect(a).not.toBe(b);
  });
});

describe("runTriad stub", () => {
  it("returns up to MAX_CANDIDATES valid candidates", async () => {
    const a = await runTriad("pluck lead", { runConsensusValidation: false });
    expect(a.candidates.length).toBeGreaterThan(0);
    expect(a.candidates.length).toBeLessThanOrEqual(8);
    for (const c of a.candidates) {
      expect(c.score).toBeGreaterThanOrEqual(0);
      expect(c.score).toBeLessThanOrEqual(1);
      expect(c.reasoning.length).toBeGreaterThan(0);
    }
  });

  it("throws on prompt guard failure", async () => {
    await expect(runTriad("```\nx\n```")).rejects.toThrow(/prompt rejected/i);
  });
});
