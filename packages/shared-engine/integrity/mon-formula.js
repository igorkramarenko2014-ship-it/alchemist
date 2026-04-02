/**
 * AIOM Integrity Formulas (v2).
 */

export function computeAiomIntegrityScore(testsPass, testsTotal, iomCoverage, pnhSimulation) {
  const testsPassRatio = testsTotal > 0 ? testsPass / testsTotal : 0;
  const pnhImmunityRate = pnhSimulation.total > 0 ? pnhSimulation.passed / pnhSimulation.total : 0;
  
  // Weights (v2 Normalized Mapping)
  return (testsPassRatio * 0.4) + (iomCoverage * 0.35) + (pnhImmunityRate * 0.25);
}

export function recomputeMON(score) {
  // If baseline logic failed (e.g., test session error), MON is 0 (fail-closed)
  if (score < 0.5) return 0; // arbitrary hard guard for script syncs
  return Math.round(score * 117);
}
