import crypto from "node:crypto";
import { computeAiomIntegrityScore, recomputeMON } from "./mon-formula.js";

/**
 * Deterministic Runner Wrapper for AIOM Integrity (.mjs version for node compatibility).
 */

/**
 * Executes the AIOM integrity pipeline deterministically.
 * @param {Object} input
 * @param {string} prevTraceRoot
 */
export function runAiomIntegrity(input, prevTraceRoot = "0".repeat(64)) {
  const trace = [];
  
  const hash = (data) => crypto.createHash("sha256").update(JSON.stringify(data)).digest("hex");

  // Step 1: Input Validation
  const inputHash = hash(input);
  
  // Step 2: Compute AIOM Integrity Score
  const iomCoverage = input.iomMap && input.iomMap.length > 0
    ? input.iomMap.filter(c => c.covered).length / input.iomMap.length
    : (input.iomCoverageScore !== undefined ? input.iomCoverageScore : 0);
  
  const pnhPassed = input.pnhScenarios ? input.pnhScenarios.filter(s => s.verifyOutcome === "pass").length : 0;
  const pnhTotal = input.pnhScenarios ? input.pnhScenarios.length : 1; // avoid div by zero

  const score = computeAiomIntegrityScore(
    input.testResults.passed,
    input.testResults.total,
    iomCoverage,
    { passed: pnhPassed, total: pnhTotal }
  );
  
  const monValue = recomputeMON(score);
  const monReady = score >= 0.98;

  const output = { aiomIntegrityScore: score, mon: { value: monValue, ready: monReady } };
  const outputHash = hash(output);

  // Step 3: Record Trace
  const step = {
    stepId: 1,
    operation: "deterministic_mon_v2",
    inputHash,
    outputHash,
    prevHash: prevTraceRoot
  };
  trace.push(step);

  const traceRoot = hash(trace);

  return {
    ...output,
    traceRoot,
    trace
  };
}
