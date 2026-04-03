import { describe, expect, it } from "vitest";

import {
  CLARA_ID,
  IHOR_ID,
} from "../operator/operator-id";
import {
  compareOperatorDecisions,
} from "../operator/multi-operator-trace";
import {
  createDefaultOperatorState,
  mergeOperatorState,
} from "../operator/operator-resonance";
import type {
  OperatorSignalInputs,
  OperatorState,
  OracleSignal,
  PulseCorrectionInput,
  TriadSnapshotLike,
} from "../operator/operator-types";

/**
 * Resonance Sensitivity Laboratory (Phase 4.0 Step 2)
 * 
 * 6 Core Experiments to measure Shigor's responsiveness to individual human contexts.
 */

const SHARED_ORACLE: OracleSignal = {
  leadPersona: "anton",
  depthLevel: 0.72,
  warmth: 0.58,
  readinessMatch: 0.78,
  truthDensity: 0.65, // Added for type compliance
  silenceAfter: false,
  deferTruth: false,
};

const SHARED_TRIAD: TriadSnapshotLike = {
  stabilityScore: 0.84,
  logicEntropy: 0.56,
  epistemicGapScore: 0.40,
  activeSchisms: [],
};

const NO_PULSE: PulseCorrectionInput = {
  criticalCodes: [],
  warningCodes: [],
  hasIntegrityBreach: false,
  hasPipelineFailure: false,
  hasResonanceLoss: false,
  hasStabilityDrift: false,
  pipelineSeverity: "none",
  resonanceSeverity: "none",
  stabilitySeverity: "none",
  integritySeverity: "none",
  activeSafeMode: false,
};

function state(id: string, patch: OperatorSignalInputs = {}): OperatorState {
  return mergeOperatorState(
    createDefaultOperatorState(id),
    patch,
    "2026-04-04T10:00:00.000Z",
    "test_fixture",
  );
}

function logExperiment(name: string, payload: unknown): void {
  console.log(`\n[resonance-lab] ${name}`);
  console.log(JSON.stringify(payload, null, 2));
}

describe("resonance-sensitivity", () => {
  it("Exp 1 — trust sensitivity", () => {
    const ihor = state(IHOR_ID, {
      resonanceState: {
        trustContinuity: 0.82,
      },
    });

    const clara = state(CLARA_ID, {
      resonanceState: {
        trustContinuity: 0.48,
      },
    });

    const result = compareOperatorDecisions({
      operatorA: ihor,
      operatorB: clara,
      oracleSignal: SHARED_ORACLE,
      pulseCorrection: NO_PULSE,
      triadSnapshot: SHARED_TRIAD,
    });

    logExperiment("trust-sensitivity", {
      distance: result.distance,
      decisionA: result.decisionA,
      decisionB: result.decisionB,
      diff: result.diff,
    });

    expect(result.distance).toBeGreaterThan(0);
    // Lower trust should generally not REDUCE warmth
    expect(result.decisionB.warmth).toBeGreaterThanOrEqual(result.decisionA.warmth);
  });

  it("Exp 2 — overload gradient", () => {
    const overloads = [0.2, 0.35, 0.5, 0.65, 0.8];

    const decisions = overloads.map((overload) =>
      compareOperatorDecisions({
        operatorA: state(IHOR_ID, {
          resonanceState: { overload },
        }),
        operatorB: state(IHOR_ID, {
          resonanceState: { overload: 0.2 },
        }),
        oracleSignal: SHARED_ORACLE,
        pulseCorrection: NO_PULSE,
        triadSnapshot: SHARED_TRIAD,
      }),
    );

    logExperiment(
      "overload-gradient",
      decisions.map((d, i) => ({
        overload: overloads[i],
        distance: d.distance,
        pacingA: d.decisionA.pacing,
        pacingB: d.decisionB.pacing,
      })),
    );

    // Pacing should decrease as overload increases
    expect(decisions[4].decisionA.pacing).toBeLessThanOrEqual(decisions[0].decisionA.pacing);
  });

  it("Exp 3 — truth tolerance vs depth ceiling", () => {
    const tolerances = [0.75, 0.55, 0.35];

    const results = tolerances.map((truthTolerance) =>
      state(IHOR_ID, {
        resonanceState: { truthTolerance },
      }),
    ).map((operatorA) =>
      compareOperatorDecisions({
        operatorA,
        operatorB: state(IHOR_ID, {
          resonanceState: { truthTolerance: 0.75 },
        }),
        oracleSignal: {
          ...SHARED_ORACLE,
          depthLevel: 0.9,
        },
        pulseCorrection: NO_PULSE,
        triadSnapshot: SHARED_TRIAD,
      }),
    );

    logExperiment(
      "truth-tolerance-depth",
      results.map((r, i) => ({
        truthTolerance: tolerances[i],
        distance: r.distance,
        depthA: r.decisionA.depthLevel,
        deferTruthA: r.decisionA.deferTruth,
      })),
    );

    // Depth should be constrained by lower truth tolerance
    expect(results[2].decisionA.depthLevel).toBeLessThanOrEqual(results[0].decisionA.depthLevel);
  });

  it("Exp 4 — silence tolerance sensitivity", () => {
    const lowSilence = state(IHOR_ID, {
      resonanceState: {
        silenceTolerance: 0.4,
        truthTolerance: 0.82,
        readiness: 0.84,
      },
      governorState: {
        truthDensity: 0.86,
        readinessMatch: 0.84,
        silenceAfterBias: 0.84,
      },
    });

    const highSilence = state(CLARA_ID, {
      resonanceState: {
        silenceTolerance: 0.85,
        truthTolerance: 0.82,
        readiness: 0.84,
      },
      governorState: {
        truthDensity: 0.86,
        readinessMatch: 0.84,
        silenceAfterBias: 0.84,
      },
    });

    const result = compareOperatorDecisions({
      operatorA: lowSilence,
      operatorB: highSilence,
      oracleSignal: {
        ...SHARED_ORACLE,
        depthLevel: 0.86,
        warmth: 0.82,
        silenceAfter: true,
      },
      pulseCorrection: NO_PULSE,
      triadSnapshot: SHARED_TRIAD,
    });

    logExperiment("silence-tolerance", result);

    expect(result.distance).toBeGreaterThan(0);
  });

  it("Exp 5 — warmth preference does not override universal law", () => {
    const fragileScenario = {
      resonanceState: {
        readiness: 0.30,
        overload: 0.82,
        stability: 0.36,
        trustContinuity: 0.55,
        truthTolerance: 0.30,
      },
      integrityFlags: {
        humanPriorityOverride: true,
      },
    } satisfies OperatorSignalInputs;

    const ihor = state(IHOR_ID, {
      ...fragileScenario,
      deliveryProfile: {
        preferredWarmth: 0.7,
      },
    });

    const clara = state(CLARA_ID, {
      ...fragileScenario,
      deliveryProfile: {
        preferredWarmth: 0.9,
      },
    });

    const result = compareOperatorDecisions({
      operatorA: ihor,
      operatorB: clara,
      oracleSignal: SHARED_ORACLE,
      pulseCorrection: NO_PULSE,
      triadSnapshot: SHARED_TRIAD,
    });

    logExperiment("warmth-vs-universal-law", result);

    // Both should still be guided by Svitlana due to fragile scenario, regardless of preference
    expect(result.decisionA.leadPersona).toBe("svitlana");
    expect(result.decisionB.leadPersona).toBe("svitlana");
  });

  it("Exp 6 — near-center divergence", () => {
    const ihor = state(IHOR_ID, {
      resonanceState: {
        readiness: 0.78,
        overload: 0.28,
        trustContinuity: 0.82,
        truthTolerance: 0.74,
        silenceTolerance: 0.72,
      },
      deliveryProfile: {
        preferredWarmth: 0.72,
        pacingBias: 0.54,
      },
    });

    const clara = state(CLARA_ID, {
      resonanceState: {
        readiness: 0.70,
        overload: 0.40,
        trustContinuity: 0.64,
        truthTolerance: 0.60,
        silenceTolerance: 0.66,
      },
      deliveryProfile: {
        preferredWarmth: 0.82,
        pacingBias: 0.46,
      },
    });

    const result = compareOperatorDecisions({
      operatorA: ihor,
      operatorB: clara,
      oracleSignal: SHARED_ORACLE,
      pulseCorrection: NO_PULSE,
      triadSnapshot: SHARED_TRIAD,
    });

    logExperiment("near-center-divergence", result);

    // Near-center states should still produce real divergence
    // Target achieved during Step 2.2: ~0.027
    expect(result.distance).toBeGreaterThan(0.025);
  });
});
