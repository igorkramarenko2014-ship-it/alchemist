import { describe, expect, it } from "vitest";
import { findTablebaseRecordForPrompt } from "../reliability/checkers-fusion";
import type { TablebaseRecord } from "../reliability/tablebase-schema";
import { isTablebaseRecord } from "../reliability/tablebase-schema";

const sample: TablebaseRecord = {
  id: "test_kick",
  keywords: ["909 kick", "kick drum"],
  candidate: {
    state: { meta: {}, master: {}, oscA: {}, oscB: {}, noise: {}, filter: {}, envelopes: [], lfos: [], fx: {}, matrix: [] },
    score: 0.9,
    reasoning: "Tablebase test row with enough chars for legibility gate.",
    panelist: "LLAMA",
    paramArray: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8],
  },
};

describe("tablebase keyword match", () => {
  it("returns first record when prompt contains a keyword", () => {
    expect(findTablebaseRecordForPrompt("I want a 909 kick", [sample])).toEqual(sample);
  });

  it("returns null when no keyword matches", () => {
    expect(findTablebaseRecordForPrompt("only pads here", [sample])).toBeNull();
  });

  it("is case-insensitive", () => {
    expect(findTablebaseRecordForPrompt("909 KICK", [sample])).toEqual(sample);
  });
});

describe("isTablebaseRecord", () => {
  it("accepts a well-formed record", () => {
    expect(isTablebaseRecord(sample)).toBe(true);
  });

  it("rejects invalid shapes", () => {
    expect(isTablebaseRecord(null)).toBe(false);
    expect(isTablebaseRecord({})).toBe(false);
    expect(isTablebaseRecord({ id: "", keywords: ["a"], candidate: sample.candidate })).toBe(false);
  });

  it("rejects out-of-range confidence", () => {
    expect(
      isTablebaseRecord({ ...sample, confidence: 1.1 })
    ).toBe(false);
    expect(
      isTablebaseRecord({ ...sample, confidence: 0 })
    ).toBe(false);
  });

  it("accepts optional confidence in (0, 1]", () => {
    expect(isTablebaseRecord({ ...sample, confidence: 0.9 })).toBe(true);
  });
});
