import { computeShigorDecision } from "./shigor-core";
import type {
  OperatorState,
  OracleSignal,
  PulseCorrectionInput,
  ShigorDecision,
  TriadSnapshotLike,
} from "./operator-types";

/**
 * Multi-Operator Trace Laboratory (Phase 4.0 Step 2)
 * 
 * Infrastructure for measuring Shigor's responsiveness to individual human contexts.
 * Focuses on 'decisionDistance' - a synthetic metric for divergence quality.
 */

export interface CompareOperatorDecisionsInput {
  operatorA: OperatorState;
  operatorB: OperatorState;
  oracleSignal?: OracleSignal;
  pulseCorrection?: PulseCorrectionInput;
  triadSnapshot?: TriadSnapshotLike;
}

export interface DecisionDistanceWeights {
  leadPersona: number;
  depthLevel: number;
  warmth: number;
  pacing: number;
  deferTruth: number;
  silenceAfter: number;
}

export interface DecisionDiff {
  leadPersonaChanged: boolean;
  deferTruthChanged: boolean;
  silenceAfterChanged: boolean;

  depthDelta: number;
  warmthDelta: number;
  pacingDelta: number;
}

export interface CompareOperatorDecisionsResult {
  decisionA: ShigorDecision;
  decisionB: ShigorDecision;

  diff: DecisionDiff;

  distance: number;
  sameLead: boolean;
  sameDeferTruth: boolean;
  sameSilenceAfter: boolean;
}

export const DEFAULT_DECISION_DISTANCE_WEIGHTS: DecisionDistanceWeights = {
  leadPersona: 0.35,
  depthLevel: 0.20,
  warmth: 0.15,
  pacing: 0.15,
  deferTruth: 0.10,
  silenceAfter: 0.05,
};

function defaultTriadSnapshot(): TriadSnapshotLike {
  return {
    stabilityScore: 0.85,
    logicEntropy: 0.55,
    epistemicGapScore: 0.35,
    activeSchisms: [],
  };
}

function boolDistance(a: boolean, b: boolean): number {
  return a === b ? 0 : 1;
}

function leadDistance(
  a: ShigorDecision["leadPersona"],
  b: ShigorDecision["leadPersona"],
): number {
  return a === b ? 0 : 1;
}

export function computeDecisionDistance(
  a: ShigorDecision,
  b: ShigorDecision,
  weights: DecisionDistanceWeights = DEFAULT_DECISION_DISTANCE_WEIGHTS,
): number {
  return (
    leadDistance(a.leadPersona, b.leadPersona) * weights.leadPersona +
    Math.abs(a.depthLevel - b.depthLevel) * weights.depthLevel +
    Math.abs(a.warmth - b.warmth) * weights.warmth +
    Math.abs(a.pacing - b.pacing) * weights.pacing +
    boolDistance(a.deferTruth, b.deferTruth) * weights.deferTruth +
    boolDistance(a.silenceAfter, b.silenceAfter) * weights.silenceAfter
  );
}

export function compareOperatorDecisions(
  input: CompareOperatorDecisionsInput,
): CompareOperatorDecisionsResult {
  const triadSnapshot = input.triadSnapshot ?? defaultTriadSnapshot();

  const decisionA = computeShigorDecision({
    operatorState: input.operatorA,
    oracleSignal: input.oracleSignal,
    pulseCorrection: input.pulseCorrection,
    triadSnapshot,
  });

  const decisionB = computeShigorDecision({
    operatorState: input.operatorB,
    oracleSignal: input.oracleSignal,
    pulseCorrection: input.pulseCorrection,
    triadSnapshot,
  });

  const diff: DecisionDiff = {
    leadPersonaChanged: decisionA.leadPersona !== decisionB.leadPersona,
    deferTruthChanged: decisionA.deferTruth !== decisionB.deferTruth,
    silenceAfterChanged: decisionA.silenceAfter !== decisionB.silenceAfter,

    depthDelta: Math.abs(decisionA.depthLevel - decisionB.depthLevel),
    warmthDelta: Math.abs(decisionA.warmth - decisionB.warmth),
    pacingDelta: Math.abs(decisionA.pacing - decisionB.pacing),
  };

  const distance = computeDecisionDistance(decisionA, decisionB);

  return {
    decisionA,
    decisionB,
    diff,
    distance,
    sameLead: !diff.leadPersonaChanged,
    sameDeferTruth: !diff.deferTruthChanged,
    sameSilenceAfter: !diff.silenceAfterChanged,
  };
}
