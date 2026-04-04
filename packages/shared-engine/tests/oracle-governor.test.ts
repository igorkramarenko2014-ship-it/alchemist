import { describe, it, expect } from "vitest";
import { getPythianSignal, OracleSignal } from "../personas/oracle-governor";
import { PersonaInfluenceSnapshot } from "../personas/persona-influence";
import { getPersonaContextAugmentation } from "../personas/persona-context";

describe("Pythia Oracle Governor (Phase 3.6)", () => {
  const mockSnapshot = (id: string, stability: number, gap: number): PersonaInfluenceSnapshot => ({
    personaId: id,
    sampleSize: 10,
    stabilityScore: stability,
    dominantLogics: [],
    logicDistribution: {},
    logicEntropyScore: 0.5,
    signatureRates: {
      pauseRate: 0.5,
      flatteryResistanceRate: 0.5,
      agencyReturnRate: 0.5,
      verbosityControlRate: 0.5
    },
    epistemicGapScore: gap,
    biasAnalytics: {
      novelty: 0.5,
      coherence: 0.5,
      risk: 0.5,
      entropy: 0.5,
      steeringMagnitude: 1.0
    },
    driftRisk: "low",
    status: "active"
  });

  it("should converge Trinity signals into a Pythian vector (Calm Power)", () => {
    const snapshots = [
      mockSnapshot("svitlana_v1", 0.9, 0.1), // High warmth
      mockSnapshot("anton_v1", 0.8, 0.2),
      mockSnapshot("elisey_v1", 0.85, 0.05) // High depth (low gap)
    ];

    const signal = getPythianSignal(snapshots);

    expect(signal.warmth).toBe(0.9);
    expect(signal.depthLevel).toBeCloseTo(0.95); // 1 - 0.05
    expect(signal.leadPersona).toBe("elisey"); // High depth priority
    expect(signal.silenceAfter).toBe(true); // Sum > threshold
  });

  it("should lead with Anton if execution stability is dominant and depth is low", () => {
    const snapshots = [
      mockSnapshot("svitlana_v1", 0.6, 0.4),
      mockSnapshot("anton_v1", 0.9, 0.7), // Gap 0.7 => Depth 0.3
      mockSnapshot("elisey_v1", 0.4, 0.8) 
    ];

    const signal = getPythianSignal(snapshots);

    expect(signal.leadPersona).toBe("anton");
    expect(signal.deferTruth).toBe(false);
  });

  it("should activate deferTruth guardrail when readiness is critically low", () => {
    const snapshots = [
      mockSnapshot("svitlana_v1", 0.2, 1.0),
      mockSnapshot("anton_v1", 0.2, 1.0),
      mockSnapshot("elisey_v1", 0.2, 0.1) // Low overall stability (readiness) but high depth (0.9)
    ];

    const signal = getPythianSignal(snapshots);

    expect(signal.readinessMatch).toBeCloseTo(0.2);
    expect(signal.depthLevel).toBeCloseTo(0.9);
    expect(signal.deferTruth).toBe(true);
  });

  describe("PersonaAugmentation Integration", () => {
    it("should inject Pythian metadata into the context prefix", () => {
      const sig: OracleSignal = {
        leadPersona: "svitlana",
        depthLevel: 0.8,
        warmth: 0.9,
        readinessMatch: 0.8,
        truthDensity: 0.5,
        silenceAfter: true,
        deferTruth: false
      };

      const aug = getPersonaContextAugmentation(["svitlana_v1"], { enabled: true, oracleSignal: sig });

      expect(aug?.contextPrefix).toContain("[ADVISORY PERSONA CONTEXT — PYTHIAN GOVERNANCE]");
      expect(aug?.contextPrefix).toContain("WARMTH=0.90");
      expect(aug?.contextPrefix).toContain("PRIMARY ANCHOR");
      expect(aug?.contextPrefix).toContain("POINT_OF_TRUTH_ANCHOR");
      expect(aug?.contextPrefix).toContain("FORMULA_OF_SILENCE ACTIVE");
    });

    it("should inject the Warning when deferTruth is active", () => {
      const sig: OracleSignal = {
        leadPersona: "svitlana",
        depthLevel: 0.9,
        warmth: 0.5,
        readinessMatch: 0.2,
        truthDensity: 0.5,
        silenceAfter: false,
        deferTruth: true
      };

      const aug = getPersonaContextAugmentation(["svitlana_v1"], { enabled: true, oracleSignal: sig });

      expect(aug?.contextPrefix).toContain("WARNING: Readiness low. Defer high-impact truth delivery.");
    });
  });
});
