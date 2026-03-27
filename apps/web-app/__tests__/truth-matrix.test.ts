import { describe, expect, it } from "vitest";
import { buildTruthMatrixSnapshot } from "../lib/truth-matrix";

describe("truth matrix snapshot", () => {
  it("returns stable row schema and runtime posture fields", () => {
    const s = buildTruthMatrixSnapshot({
      triadLivePanelists: ["deepseek", "llama"],
      triadFullyLive: false,
      wasmAvailable: true,
      strictOffsetsEnabled: true,
    });

    expect(s.rows.length).toBe(5);
    expect(s.wasmStatus).toBe("available");
    expect(s.hardGate).toBe("enforced");
    expect(["fresh", "stale_data", "unknown"]).toContain(s.freshnessStatus);
    expect(["ok", "integrity_failure"]).toContain(s.integrityStatus);
    expect(Array.isArray(s.contractDivergences)).toBe(true);
    expect(s.triadFullyLive).toBe(false);
    expect(s.rows[0]?.path).toContain("Triad");
    expect(Array.isArray(s.runtimeChecks?.checks)).toBe(true);
    if (s.canonicalArtifactPath && s.canonicalMetrics) {
      expect(typeof s.truthArtifactGeneratedAtUtc === "string" || s.truthArtifactGeneratedAtUtc === null).toBe(
        true,
      );
      expect(typeof s.divergenceCheckedAtUtc === "string" || s.divergenceCheckedAtUtc === null).toBe(true);
      if (s.canonicalMetrics.testsTotal != null) {
        expect(s.canonicalMetrics.testsPassed).toBe(s.canonicalMetrics.testsTotal);
      }
      if (s.canonicalMetrics.iomCoverageScore != null) {
        expect(s.canonicalMetrics.iomCoverageScore).toBeGreaterThanOrEqual(0);
        expect(s.canonicalMetrics.iomCoverageScore).toBeLessThanOrEqual(1);
      }
      if (s.canonicalMetrics.divergences != null) {
        expect(typeof s.canonicalMetrics.divergences).toBe("number");
      }
      if (s.canonicalMetrics.pnhImmunity && typeof s.canonicalMetrics.pnhImmunity === "object") {
        const p = s.canonicalMetrics.pnhImmunity as { passed?: number; total?: number; breaches?: number };
        expect(p.passed).toBeDefined();
        expect(p.total).toBeDefined();
        expect(p.breaches).toBeDefined();
      }
    }
  });
});

