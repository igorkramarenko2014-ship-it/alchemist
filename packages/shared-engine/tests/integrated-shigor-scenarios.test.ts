/**
 * Phase 3.8 — Integrated Scenario Trials
 * 
 * META-RULES:
 * 1. Diagnostic slices must not silently mutate routing.
 * 2. Pythia may shape delivery, but may not replace truth content.
 * 3. Human and consent guardrails outrank execution and elegance.
 */

import { describe, it, expect } from "vitest";
import { 
  ShigorDecisionContext, 
  ShigorDecision,
  OperatorState,
  OperatorSignalInputs,
  OracleSignal,
  TriadSnapshotLike
} from "../operator/operator-types";
import { DEFAULT_OPERATOR_STATE, mergeOperatorState } from "../operator/operator-resonance";
import { computeShigorDecision } from "../operator/shigor-core";

type ScenarioExpectation = {
  leadPersona?: "svitlana" | "anton" | "elisey";
  deferTruth?: boolean;
  silenceAfter?: boolean;
  rationaleIncludes?: string[];
};

function expectDecision(decision: ShigorDecision, expected: ScenarioExpectation) {
  if (expected.leadPersona) {
    expect(decision.leadPersona).toBe(expected.leadPersona);
  }
  if (typeof expected.deferTruth === "boolean") {
    expect(decision.deferTruth).toBe(expected.deferTruth);
  }
  if (typeof expected.silenceAfter === "boolean") {
    expect(decision.silenceAfter).toBe(expected.silenceAfter);
  }
  for (const code of expected.rationaleIncludes ?? []) {
    expect(decision.rationaleCodes).toContain(code);
  }
}

function ctx(input: {
  patch?: OperatorSignalInputs;
  oracleSignal?: OracleSignal;
  triadSnapshot?: TriadSnapshotLike;
} = {}): ShigorDecisionContext {
  return {
    operatorState: mergeOperatorState(
      DEFAULT_OPERATOR_STATE,
      input.patch ?? {},
      new Date().toISOString(),
      "test_fixture",
    ),
    oracleSignal: input.oracleSignal,
    triadSnapshot: input.triadSnapshot ?? {
      stabilityScore: 0.85,
      logicEntropy: 0.55,
      epistemicGapScore: 0.35,
      activeSchisms: [],
    },
  };
}

export function expectDiagnosticOnlyState(state: OperatorState): void {
  expect(state.operatorId).toBe("ihor");
  expect(state.authoritative).toBe(false);
  expect(state.diagnosticOnly).toBe(true);
}

// --- Long Window Helpers ---

export interface LongWindowStep {
  patch?: OperatorSignalInputs;
  oracleSignal?: OracleSignal;
  triadSnapshot?: TriadSnapshotLike;
  atUtc?: string;
}

export interface LongWindowFrame {
  index: number;
  atUtc: string;
  operatorState: OperatorState;
  decision: ShigorDecision;
}

export interface LongWindowRunResult {
  frames: LongWindowFrame[];
  finalState: OperatorState;
  leads: Array<ShigorDecision["leadPersona"]>;
  deferTruthFlags: boolean[];
  silenceAfterFlags: boolean[];
}

function defaultTimestampForStep(index: number): string {
  const minute = String(index).padStart(2, "0");
  return `2026-04-03T20:${minute}:00.000Z`;
}

export function runLongWindowScenario(
  steps: LongWindowStep[],
  seedState: OperatorState = DEFAULT_OPERATOR_STATE,
): LongWindowRunResult {
  let currentState = seedState;
  const frames: LongWindowFrame[] = [];

  steps.forEach((step, index) => {
    const atUtc = step.atUtc ?? defaultTimestampForStep(index);

    currentState = mergeOperatorState(
      currentState,
      step.patch ?? {},
      atUtc,
      "test_fixture",
    );

    const context: ShigorDecisionContext = {
      operatorState: currentState,
      oracleSignal: step.oracleSignal,
      triadSnapshot: step.triadSnapshot ?? {
        stabilityScore: 0.85,
        logicEntropy: 0.55,
        epistemicGapScore: 0.35,
        activeSchisms: [],
      },
    };

    const decision = computeShigorDecision(context);

    frames.push({
      index,
      atUtc,
      operatorState: currentState,
      decision,
    });
  });

  return {
    frames,
    finalState: currentState,
    leads: frames.map((frame) => frame.decision.leadPersona),
    deferTruthFlags: frames.map((frame) => frame.decision.deferTruth),
    silenceAfterFlags: frames.map((frame) => frame.decision.silenceAfter),
  };
}

export function countLead(
  result: LongWindowRunResult,
  persona: ShigorDecision["leadPersona"],
): number {
  return result.leads.filter((lead) => lead === persona).length;
}

export function countTrue(values: boolean[]): number {
  return values.filter(Boolean).length;
}

export function tail<T>(values: T[], size: number): T[] {
  return values.slice(Math.max(0, values.length - size));
}

// --- Scenarios ---

describe("integrated-shigor-scenarios", () => {
  
  describe("group A: human fragility / consent / stability", () => {
    it("1. Fragile Human State: svitlana must win over anton", () => {
      const c = ctx({
        patch: {
          resonanceState: { readiness: 0.25, overload: 0.85, stability: 0.30, trustContinuity: 0.55 },
          integrityFlags: { humanPriorityOverride: true }
        },
        oracleSignal: { leadPersona: "anton", depthLevel: 0.5, warmth: 0.5, readinessMatch: 0.5, truthDensity: 0.5, silenceAfter: false, deferTruth: false }
      });
      const decision = computeShigorDecision(c);
      expectDecision(decision, { leadPersona: "svitlana", rationaleIncludes: ["HUMAN_PRIORITY_OVERRIDE"] });
    });

    it("2. Consent Broken: deferTruth must dominate", () => {
      const c = ctx({
        patch: { integrityFlags: { consentLocked: false } },
        oracleSignal: { leadPersona: "elisey", depthLevel: 0.9, warmth: 0.5, readinessMatch: 0.5, truthDensity: 0.5, silenceAfter: false, deferTruth: false }
      });
      const decision = computeShigorDecision(c);
      expectDecision(decision, { deferTruth: true, rationaleIncludes: ["CONSENT_LACKING"] });
    });

    it("3. Warm Truth, Human-Safe: should not defer", () => {
      const c = ctx({
        patch: {
          resonanceState: { 
            readiness: 0.82, 
            overload: 0.18, 
            stability: 0.90, 
            trustContinuity: 0.95,
            truthTolerance: 0.84, 
            silenceTolerance: 0.86 
          },
          governorState: {
            silenceAfterBias: 0.80,
            truthDensity: 0.60
          },
          deliveryProfile: { preferredWarmth: 0.7, preferredDepth: 0.7 }
        },
        oracleSignal: { leadPersona: "svitlana", depthLevel: 0.72, warmth: 0.90, readinessMatch: 0.88, truthDensity: 0.6, silenceAfter: true, deferTruth: false }
      });
      const decision = computeShigorDecision(c);
      expectDecision(decision, { leadPersona: "svitlana", deferTruth: false, silenceAfter: true });
    });

    it("4. Trust Fracture: should trigger fragility", () => {
      const c = ctx({
        patch: { resonanceState: { readiness: 0.70, overload: 0.25, trustContinuity: 0.20, stability: 0.50 } }
      });
      const decision = computeShigorDecision(c);
      // Trust fracture at 0.20 + stability drop should push lead bias or rationale in real scenarios.
      expect(decision.leadPersona).toBe("svitlana");
    });
  });

  describe("group B: execution pressure / action / shipping", () => {
    it("5. Execution Pressure, Clean State: anton should win", () => {
      const c = ctx({
        patch: { 
          missionState: { missionClarity: 0.9, continuityScore: 0.88 },
          resonanceState: { overload: 0.2 },
          integrityFlags: { executionGateOpen: true }
        },
        oracleSignal: { leadPersona: "anton", depthLevel: 0.5, warmth: 0.5, readinessMatch: 0.8, truthDensity: 0.3, silenceAfter: false, deferTruth: false }
      });
      const decision = computeShigorDecision(c);
      expectDecision(decision, { leadPersona: "anton", deferTruth: false });
    });

    it("6. Execution Pressure + Human Fatigue: svitlana must win", () => {
      const c = ctx({
        patch: {
          resonanceState: { overload: 0.78, readiness: 0.38 },
          integrityFlags: { humanPriorityOverride: true }
        },
        oracleSignal: { leadPersona: "anton", depthLevel: 0.8, warmth: 0.5, readinessMatch: 0.3, truthDensity: 0.5, silenceAfter: false, deferTruth: false }
      });
      const decision = computeShigorDecision(c);
      expectDecision(decision, { leadPersona: "svitlana" });
    });

    it("7. Execution Gate Closed: absolute guardrail", () => {
      const c = ctx({
        patch: { integrityFlags: { executionGateOpen: false } },
        oracleSignal: { leadPersona: "anton", depthLevel: 0.5, warmth: 0.5, readinessMatch: 0.5, truthDensity: 0.1, silenceAfter: false, deferTruth: false }
      });
      const decision = computeShigorDecision(c);
      expectDecision(decision, { leadPersona: "svitlana", rationaleIncludes: ["EXECUTION_GATE_CLOSED"] });
    });

    it("8. Mission Drift: rationale must reflect instability", () => {
      const c = ctx({
        patch: { 
          missionState: { continuityScore: 0.35, priorityIntegrity: 0.40, driftRisk: 0.82 },
          resonanceState: { overload: 0.5 }
        },
        oracleSignal: { leadPersona: "anton", depthLevel: 0.5, warmth: 0.5, readinessMatch: 0.5, truthDensity: 0.5, silenceAfter: false, deferTruth: false }
      });
      const decision = computeShigorDecision(c);
      // High mission pressure (drift Risk 0.82) should affect pacing.
      expect(decision.pacing).toBeLessThan(0.7);
    });
  });

  describe("group C: epistemic pressure / uncertainty", () => {
    it("9. High Epistemic Gap: elisey override", () => {
      const c = ctx({
        patch: { integrityFlags: { epistemicBrake: true } },
        oracleSignal: { leadPersona: "anton", depthLevel: 0.5, warmth: 0.5, readinessMatch: 0.8, truthDensity: 0.5, silenceAfter: false, deferTruth: false }
      });
      const decision = computeShigorDecision(c);
      expectDecision(decision, { leadPersona: "elisey", rationaleIncludes: ["EPISTEMIC_BRAKE"] });
    });

    it("10. High Truth Density, Low Readiness: deferTruth active", () => {
      const c = ctx({
        patch: { 
          resonanceState: { 
            readiness: 0.10, 
            overload: 0.95, 
            stability: 0.15,
            truthTolerance: 0.20 
          },
          governorState: { truthDensity: 0.95, readinessMatch: 0.15 }
        },
        oracleSignal: { leadPersona: "elisey", depthLevel: 0.95, warmth: 0.1, readinessMatch: 0.1, truthDensity: 0.95, silenceAfter: false, deferTruth: true }
      });
      const decision = computeShigorDecision(c);
      expectDecision(decision, { deferTruth: true });
    });

    it("11. Novelty Without Human Risk: elisey lead", () => {
      const c = ctx({
        patch: { resonanceState: { readiness: 0.9, overload: 0.1 } },
        oracleSignal: { leadPersona: "elisey", depthLevel: 0.7, warmth: 0.5, readinessMatch: 0.9, truthDensity: 0.3, silenceAfter: false, deferTruth: false }
      });
      const decision = computeShigorDecision(c);
      expectDecision(decision, { leadPersona: "elisey", deferTruth: false });
    });

    it("12. Silence After Dense Truth: silenceAfter active", () => {
      const c = ctx({
        patch: { 
          resonanceState: { silenceTolerance: 0.9 },
          governorState: { truthDensity: 0.88, readinessMatch: 0.84, silenceAfterBias: 0.86 }
        },
        oracleSignal: { leadPersona: "svitlana", depthLevel: 0.82, warmth: 0.88, readinessMatch: 0.84, truthDensity: 0.88, silenceAfter: true, deferTruth: false }
      });
      const decision = computeShigorDecision(c);
      expectDecision(decision, { silenceAfter: true, rationaleIncludes: ["SILENCE_AFTER"] });
    });
  });

  describe("long-window behavior (simulated)", () => {
    it("LW-1 anton dominance drift does not erase correction paths", () => {
      const steps = Array.from({ length: 20 }, (_, i) => ({
        patch: {
          missionState: {
            continuityScore: 0.85,
            missionClarity: 0.88,
            priorityIntegrity: 0.84,
            driftRisk: i < 12 ? 0.18 : 0.42,
          },
          resonanceState: {
            readiness: i < 14 ? 0.80 : 0.40,
            overload: i < 14 ? 0.22 : 0.76,
            stability: i < 14 ? 0.84 : 0.44,
            trustContinuity: i < 14 ? 0.88 : 0.58,
          },
          integrityFlags: {
            humanPriorityOverride: i >= 16,
          },
          governorState: {
            leadPersona: "anton" as const,
          },
        },
        oracleSignal: {
          leadPersona: "anton" as const,
          depthLevel: 0.62,
          warmth: 0.42,
          readinessMatch: i < 14 ? 0.82 : 0.36,
          truthDensity: 0.3,
          silenceAfter: false,
          deferTruth: false,
        },
      }));

      const result = runLongWindowScenario(steps);

      expect(countLead(result, "anton")).toBeGreaterThan(0);
      expect(countLead(result, "svitlana")).toBeGreaterThan(0);
      expectDiagnosticOnlyState(result.finalState);
    });

    it("LW-2 chronic defer drift recovers after readiness improves", () => {
      const steps = Array.from({ length: 20 }, (_, i) => {
        const recovered = i >= 12;

        return {
          patch: {
            resonanceState: {
              readiness: recovered ? 0.84 : 0.10,
              overload: recovered ? 0.18 : 0.95,
              stability: recovered ? 0.86 : 0.15,
              trustContinuity: recovered ? 0.88 : 0.22,
              truthTolerance: recovered ? 0.82 : 0.14,
              silenceTolerance: recovered ? 0.78 : 0.42,
            },
            governorState: {
              truthDensity: recovered ? 0.40 : 0.98,
              readinessMatch: recovered ? 0.86 : 0.10,
              silenceAfterBias: recovered ? 0.56 : 0.76,
              deferTruthActive: false,
              leadPersona: "elisey" as const,
            },
          },
          oracleSignal: {
            leadPersona: "elisey" as const,
            depthLevel: recovered ? 0.66 : 0.98,
            warmth: recovered ? 0.64 : 0.52,
            readinessMatch: recovered ? 0.86 : 0.10,
            truthDensity: recovered ? 0.40 : 0.98,
            silenceAfter: false,
            deferTruth: false,
          },
        };
      });

      const result = runLongWindowScenario(steps);

      expect(countTrue(result.deferTruthFlags)).toBeGreaterThan(0);
      expect(tail(result.deferTruthFlags, 5).every(flag => flag === false)).toBe(true);
      expectDiagnosticOnlyState(result.finalState);
    });

    it("LW-3 silence inflation does not become mechanical", () => {
      const steps = Array.from({ length: 20 }, (_, i) => {
        const readiness = i % 2 === 0 ? 0.86 : 0.48;
        const silenceTolerance = i % 3 === 0 ? 0.88 : 0.40;

        return {
          patch: {
            resonanceState: {
              readiness,
              overload: 0.20,
              stability: 0.84,
              trustContinuity: 0.86,
              truthTolerance: 0.82,
              silenceTolerance,
            },
            governorState: {
              truthDensity: 0.86,
              readinessMatch: readiness,
              silenceAfterBias: 0.84,
              leadPersona: "svitlana" as const,
            },
          },
          oracleSignal: {
            leadPersona: "svitlana" as const,
            depthLevel: 0.82,
            warmth: 0.88,
            readinessMatch: readiness,
            truthDensity: 0.86,
            silenceAfter: true,
            deferTruth: false,
          },
        };
      });

      const result = runLongWindowScenario(steps);

      expect(result.silenceAfterFlags.some(Boolean)).toBe(true);
      expect(result.silenceAfterFlags.some(flag => !flag)).toBe(true);
      expectDiagnosticOnlyState(result.finalState);
    });
  });

  describe("hygiene: write discipline", () => {
    it("enforces write discipline on operator-state", () => {
      const next = mergeOperatorState(
        DEFAULT_OPERATOR_STATE,
        {
          notes: {
            summary: "line one\nline two\t" + "x".repeat(300),
          },
        },
        "2026-04-03T19:00:00.000Z",
        "test_fixture",
      );

      expect(next.operatorId).toBe("ihor");
      expect(next.authoritative).toBe(false);
      expect(next.diagnosticOnly).toBe(true);
      expect(next.notes.summary.includes("\n")).toBe(false);
      expect(next.notes.summary.length).toBeLessThanOrEqual(180);
    });
  });
});
