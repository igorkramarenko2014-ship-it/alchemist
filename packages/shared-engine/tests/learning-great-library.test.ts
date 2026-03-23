import { describe, expect, it, vi } from "vitest";
import {
  logGreatLibraryMerge,
  mergeGreatLibraryIntoSoeSnapshot,
} from "../learning/great-library";

describe("Great Library (AGL) SOE bridge", () => {
  const base = {
    meanPanelistMs: 4000,
    triadFailureRate: 0.1,
    gateDropRate: 0.2,
  };

  it("throws without provenance", () => {
    expect(() =>
      mergeGreatLibraryIntoSoeSnapshot(base, {
        provenance: "   ",
        collectedAt: "2026-03-15T00:00:00.000Z",
      })
    ).toThrow(/provenance/);
  });

  it("merges only finite numeric augment keys", () => {
    const r = mergeGreatLibraryIntoSoeSnapshot(base, {
      provenance: "test-dataset CC-BY manifest https://example.org",
      collectedAt: "2026-03-15T00:00:00.000Z",
      jobRunId: "job-1",
      snapshotAugment: {
        gateDropRate: 0.35,
        meanPanelistMs: NaN as unknown as number,
        triadFailureRate: 0.05,
      },
    });
    expect(r.snapshot.gateDropRate).toBe(0.35);
    expect(r.snapshot.meanPanelistMs).toBe(4000);
    expect(r.snapshot.triadFailureRate).toBe(0.05);
    expect(r.appliedAugmentKeys.sort()).toEqual(["gateDropRate", "triadFailureRate"]);
    expect(r.provenance).toContain("test-dataset");
  });

  it("logGreatLibraryMerge emits great_library_soe_merge", () => {
    const spy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const r = mergeGreatLibraryIntoSoeSnapshot(base, {
      provenance: "audit-trail",
      collectedAt: "2026-03-15T00:00:00.000Z",
      snapshotAugment: { meanRunMs: 9000 },
    });
    logGreatLibraryMerge(r, "run_gl");
    const line = spy.mock.calls.map((c) => String(c[0])).join("");
    spy.mockRestore();
    expect(line).toContain('"event":"great_library_soe_merge"');
    expect(line).toContain("audit-trail");
    expect(line).toContain("run_gl");
    expect(line).toContain("agentAjiFusionLines");
  });
});
