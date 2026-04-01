import { describe, it, expect, beforeEach, vi } from "vitest";
import { solveParameters } from "../transmutation/parameter-solver";
import { PolicyFamily } from "../transmutation/transmutation-types";
import { TRANSMUTATION_BOUNDS } from "../transmutation/transmutation-bounds";
import * as fs from "node:fs";

vi.mock("node:fs");

describe("MOVE 4 — Refinery Safety Budget", () => {
  const mockTask = { task_type: "bass", confidence: 0.8 } as any;
  const mockContext = { lesson_matches: [], cluster_affinity: {}, corpus_density: 0.5 } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should enforce the ±0.04 cumulative drift budget per parameter", () => {
    // Mock a manifest with multiple large nudges that exceed the budget
    const mockManifest = {
      version: 1,
      overrides: [
        {
          policyFamily: PolicyFamily.CORPUS_LED,
          nudge: { triad_weights: { DEEPSEEK: 0.03 } }
        },
        {
          policyFamily: PolicyFamily.CORPUS_LED,
          nudge: { triad_weights: { DEEPSEEK: 0.03 } } // Total would be 0.06
        }
      ]
    };

    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    vi.spyOn(fs, "readFileSync").mockReturnValue(JSON.stringify(mockManifest));

    const { profile, audit } = solveParameters(PolicyFamily.CORPUS_LED, mockTask, mockContext);

    const baseline = TRANSMUTATION_BOUNDS.baseline_triad_weights.DEEPSEEK;
    const policyShift = 0.08 + 0.8 * 0.04; // CORPUS_LED: 0.112
    const totalDeepseek = profile.triad_weights.DEEPSEEK;

    // Actual profile = (baseline + policyShift + refineryDelta) / sum
    // Without normalization: baseline + 0.112 + 0.04 (clamped)
    // We expect the REFINERY delta to be exactly 0.04 in the audit trail
    const refineryDeltas = audit.deltas_applied.filter(d => d.includes("REFINERY"));
    expect(refineryDeltas[0]).toContain("0.030");
    expect(refineryDeltas[1]).toContain("0.010"); // Clamped: 0.04 - 0.03 = 0.01
    
    // Total nudged weight (before normalization sum = 1) is checked in audit trace
    // The engine's final weights are normalized, but the audit confirms the logic
  });

  it("should correctly match taskType specific overrides", () => {
    const mockManifest = {
      version: 1,
      overrides: [
        {
          policyFamily: PolicyFamily.CORPUS_LED,
          taskType: "lead", // Should NOT match current task "bass"
          nudge: { priors: { corpus_affinity_weight: 0.04 } }
        },
        {
          policyFamily: PolicyFamily.CORPUS_LED,
          taskType: "bass", // Should match
          nudge: { priors: { taste_weight: 0.02 } }
        }
      ]
    };

    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    vi.spyOn(fs, "readFileSync").mockReturnValue(JSON.stringify(mockManifest));

    const { audit } = solveParameters(PolicyFamily.CORPUS_LED, mockTask, mockContext);
    
    const applied = audit.deltas_applied.filter(d => d.includes("REFINERY"));
    expect(applied.length).toBe(1);
    expect(applied[0]).toContain("taste_weight");
    expect(applied[0]).not.toContain("corpus_affinity_weight");
  });
});
