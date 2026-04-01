import { describe, it, expect, beforeEach, vi } from "vitest";
import { aggregateRefineryEvidence } from "../transmutation/refinery/refinery-aggregator";
import * as fs from "fs";

vi.mock("fs");

describe("MOVE 4 — Refinery Aggregator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should filter out buckets with low sample counts (< 20)", () => {
    // Mock 5 events for CORPUS_LED | bass
    const events = new Array(5).fill(0).map(() => JSON.stringify({
      event: "transmutation_outcome_alignment",
      policyFamily: "CORPUS_LED",
      status: "applied",
      alignmentFinal: 0.8,
      alignmentConfidence: 0.9,
      taskSchemaSnapshot: { task_type: "bass" }
    })).join("\n");

    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    vi.spyOn(fs, "readdirSync").mockReturnValue(["test.jsonl"] as any);
    vi.spyOn(fs, "readFileSync").mockReturnValue(events);

    const evidence = aggregateRefineryEvidence();
    expect(evidence.length).toBe(0); // Should be filtered out
  });

  it("should filter out buckets with low mean confidence (< 0.5)", () => {
    // Mock 25 events with low confidence
    const events = new Array(25).fill(0).map(() => JSON.stringify({
      event: "transmutation_outcome_alignment",
      policyFamily: "CORPUS_LED",
      status: "applied",
      alignmentFinal: 0.5,
      alignmentConfidence: 0.3, // Low confidence
      taskSchemaSnapshot: { task_type: "bass" }
    })).join("\n");

    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    vi.spyOn(fs, "readdirSync").mockReturnValue(["test.jsonl"] as any);
    vi.spyOn(fs, "readFileSync").mockReturnValue(events);

    const evidence = aggregateRefineryEvidence();
    expect(evidence.length).toBe(0); // Should be filtered out
  });

  it("should include buckets meeting all signal quality criteria", () => {
    const events = new Array(20).fill(0).map(() => JSON.stringify({
      event: "transmutation_outcome_alignment",
      policyFamily: "TASTE_LED",
      status: "applied",
      alignmentFinal: 0.9,
      alignmentConfidence: 0.8,
      taskSchemaSnapshot: { task_type: "pluck" }
    })).join("\n");

    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    vi.spyOn(fs, "readdirSync").mockReturnValue(["test.jsonl"] as any);
    vi.spyOn(fs, "readFileSync").mockReturnValue(events);

    const evidence = aggregateRefineryEvidence();
    expect(evidence.length).toBe(1);
    expect(evidence[0].policyFamily).toBe("TASTE_LED");
    expect(evidence[0].sampleCount).toBe(20);
    expect(evidence[0].meanAlignment).toBeCloseTo(0.9);
  });
});
