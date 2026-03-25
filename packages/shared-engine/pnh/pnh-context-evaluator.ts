/**
 * Deterministic PNH context → risk / environment (auditable heuristics, not ML).
 */
import type {
  PnhContextEvaluation,
  PnhContextInput,
  PnhEnvironmentClass,
  PnhRiskLevel,
} from "./pnh-context-types";

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/**
 * Score **[0,1]** fragility — higher = more defensive posture recommended.
 */
export function pnhContextFragilityScore(c: PnhContextInput): number {
  let s = 0.2;
  if (c.triadFullyLive === true) s -= 0.05;
  if (c.triadFullyLive === false) s += 0.15;
  if (c.triadParityMode === "mixed" || c.triadParityMode === "unknown") s += 0.12;
  if (c.triadParityMode === "stub") s += 0.08;
  if (typeof c.iomSchismCount === "number" && c.iomSchismCount > 0) {
    s += clamp(c.iomSchismCount * 0.04, 0, 0.2);
  }
  if (c.verifyMode === "selective") s += 0.1;
  if (c.verifyMode === "local") s += 0.03;
  if (typeof c.pnhRepeatTriggersSession === "number" && c.pnhRepeatTriggersSession > 0) {
    s += clamp(c.pnhRepeatTriggersSession * 0.06, 0, 0.25);
  }
  if (typeof c.taxonomySize === "number" && c.taxonomySize > 200) s += 0.06;
  if (c.wasmReal === false) s += 0.05;
  return clamp(s, 0, 1);
}

export function evaluatePnhContext(context: PnhContextInput): PnhContextEvaluation {
  const f = pnhContextFragilityScore(context);
  let riskLevel: PnhRiskLevel;
  if (f >= 0.72) riskLevel = "critical";
  else if (f >= 0.42) riskLevel = "elevated";
  else riskLevel = "low";

  let environment: PnhEnvironmentClass;
  if (f >= 0.65) environment = "hostile";
  else if (f >= 0.35) environment = "uncertain";
  else environment = "safe";

  return { riskLevel, environment };
}
