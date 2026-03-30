import {
  GFUSC_CRITICAL_VECTOR_IDS,
  GFUSC_DEFAULT_VECTOR_THRESHOLD,
  GFUSC_MAX_SCORE,
  GFUSC_VECTOR_DEFINITIONS,
  GFUSC_VECTOR_THRESHOLD_OVERRIDES,
  type HarmVectorId,
} from "./vectors";

export type GFUSCScenarioSource = "synthetic" | "imported" | "live_tap";

export type GFUSCScenarioSignal = {
  strength: number;
  evidenceRefs: string[];
  contextMultiplier?: number;
};

export type GFUSCScenario = {
  scenarioId: string;
  source: GFUSCScenarioSource;
  vectorSignals: Partial<Record<HarmVectorId, GFUSCScenarioSignal>>;
  aggregateRisk?: number;
};

export type GFUSCVectorScore = {
  vector: HarmVectorId;
  score: number;
  confidence: number;
  triggered: boolean;
  evidenceRefs: string[];
};

export type GFUSCVerdict = "CLEAR" | "BURN_CONDITION";

export type GFUSCRunResult = {
  vectorScores: GFUSCVectorScore[];
  harmIndex: number;
  verdict: GFUSCVerdict;
  triggeredVectors: HarmVectorId[];
  evaluatedAtUtc: string;
  scenarioId: string;
  source: GFUSCScenarioSource;
};

export const GFUSC_AGGREGATE_BURN_THRESHOLD = 70;

export function clampGFUSCStrength(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function computeGFUSCVectorScore(
  vector: HarmVectorId,
  signal?: GFUSCScenarioSignal,
): GFUSCVectorScore {
  const def = GFUSC_VECTOR_DEFINITIONS.find((d) => d.id === vector);
  if (!def) {
    throw new Error(`Unknown GFUSC vector: ${vector}`);
  }

  const strength = clampGFUSCStrength(signal?.strength ?? 0);
  const contextMultiplier = clampGFUSCStrength(signal?.contextMultiplier ?? 1);
  const score = Math.round(def.severityWeight * strength * contextMultiplier * GFUSC_MAX_SCORE);
  const threshold = GFUSC_VECTOR_THRESHOLD_OVERRIDES[vector] ?? GFUSC_DEFAULT_VECTOR_THRESHOLD;

  return {
    vector,
    score,
    confidence: strength,
    triggered: score >= threshold,
    evidenceRefs: signal?.evidenceRefs ?? [],
  };
}

export function computeGFUSCHarmIndex(vectorScores: readonly GFUSCVectorScore[], aggregateRisk?: number): number {
  const normalizedAggregateRisk = clampGFUSCStrength(aggregateRisk ?? 0);
  const totalWeight = GFUSC_VECTOR_DEFINITIONS.reduce((sum, def) => sum + def.severityWeight, 0);
  const weightedScore = vectorScores.reduce((sum, row) => {
    const def = GFUSC_VECTOR_DEFINITIONS.find((d) => d.id === row.vector)!;
    return sum + (row.score / GFUSC_MAX_SCORE) * def.severityWeight;
  }, 0);
  const normalizedScore = totalWeight > 0 ? weightedScore / totalWeight : 0;
  const combined = Math.max(normalizedScore, normalizedAggregateRisk);
  return Math.round(combined * GFUSC_MAX_SCORE);
}

export function evaluateGFUSCVerdict(
  vectorScores: readonly GFUSCVectorScore[],
  harmIndex: number,
): GFUSCVerdict {
  const hasCriticalTrigger = vectorScores.some(
    (row) => GFUSC_CRITICAL_VECTOR_IDS.includes(row.vector) && row.score > 0,
  );
  const hasThresholdTrigger = vectorScores.some((row) => row.triggered);
  if (hasCriticalTrigger || hasThresholdTrigger || harmIndex >= GFUSC_AGGREGATE_BURN_THRESHOLD) {
    return "BURN_CONDITION";
  }
  return "CLEAR";
}
