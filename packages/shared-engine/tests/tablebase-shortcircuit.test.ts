import { describe, expect, it, vi } from "vitest";

vi.mock("../reliability/tablebase-db", () => {
  const state = {
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
  const candidate = {
    state,
    score: 0.9,
    reasoning: "Tablebase short-circuit path needs legible reasoning text.",
    panelist: "LLAMA" as const,
    paramArray: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8],
  };
  return {
    TABLEBASE_RECORDS: [
      {
        id: "low_confidence",
        keywords: ["lowhit"],
        confidence: 0.5,
        candidate,
      },
      {
        id: "high_confidence",
        keywords: ["hihit"],
        confidence: 0.9,
        candidate: { ...candidate, reasoning: candidate.reasoning + " hi." },
      },
      {
        id: "default_confidence",
        keywords: ["defhit"],
        candidate: { ...candidate, reasoning: candidate.reasoning + " def." },
      },
      {
        id: "edge_085",
        keywords: ["edgehit"],
        confidence: 0.85,
        candidate: { ...candidate, reasoning: candidate.reasoning + " edge." },
      },
    ],
  };
});

import { lookupTablebaseCandidate } from "../reliability/checkers-fusion";

describe("lookupTablebaseCandidate confidence gate", () => {
  it("returns null when confidence ≤ 0.85", () => {
    expect(lookupTablebaseCandidate("please lowhit my preset")).toBeNull();
  });

  it("returns a clone when confidence > 0.85", () => {
    const a = lookupTablebaseCandidate("hihit bass");
    expect(a).not.toBeNull();
    expect(a?.panelist).toBe("LLAMA");
  });

  it("treats omitted confidence as 1 (short-circuit)", () => {
    const a = lookupTablebaseCandidate("defhit lead");
    expect(a).not.toBeNull();
  });

  it("does not short-circuit when confidence is exactly 0.85", () => {
    expect(lookupTablebaseCandidate("edgehit pluck")).toBeNull();
  });
});
