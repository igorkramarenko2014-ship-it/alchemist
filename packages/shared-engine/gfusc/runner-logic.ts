import {
  computeGFUSCHarmIndex,
  computeGFUSCVectorScore,
  evaluateGFUSCVerdict,
  type GFUSCRunResult,
  type GFUSCScenario,
} from "./verdict";
import { GFUSC_VECTOR_IDS } from "./vectors";

/**
 * Pure logic for evaluating GFUSC scenarios (browser-safe).
 * No Node.js dependencies.
 */
export function runGFUSCScenarios(scenario: GFUSCScenario): GFUSCRunResult {
  const vectorScores = GFUSC_VECTOR_IDS.map((vector) =>
    computeGFUSCVectorScore(vector, scenario.vectorSignals[vector]),
  );
  const harmIndex = computeGFUSCHarmIndex(vectorScores, scenario.aggregateRisk);
  const verdict = evaluateGFUSCVerdict(vectorScores, harmIndex);

  return {
    vectorScores,
    harmIndex,
    verdict,
    triggeredVectors: vectorScores.filter((row) => row.triggered).map((row) => row.vector),
    evaluatedAtUtc: new Date().toISOString(),
    scenarioId: scenario.scenarioId,
    source: scenario.source,
  };
}
