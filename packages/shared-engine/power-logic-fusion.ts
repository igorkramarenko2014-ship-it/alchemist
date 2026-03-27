export type PlfConfidence = "low" | "medium" | "high";
export type PlfProbe = "none" | "creative_stance" | "contrast_constraint";
export type PlfClassification = "valid" | "noise";

export interface PlfSignals {
  gateDropRate: number;
  triadFailureRate: number;
  pnhInterventionCount: number;
  candidateCount: number;
}

export interface PlfDecision {
  confidence: PlfConfidence;
  probe: PlfProbe;
  classification: PlfClassification;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

export function evaluateSignals(signals: PlfSignals): PlfConfidence {
  const reliability =
    0.45 * (1 - clamp01(signals.gateDropRate)) +
    0.35 * (1 - clamp01(signals.triadFailureRate)) +
    0.2 * (signals.candidateCount > 0 ? 1 : 0);
  if (reliability >= 0.8 && signals.pnhInterventionCount === 0) return "high";
  if (reliability >= 0.5) return "medium";
  return "low";
}

export function generateLowCostProbe(confidence: PlfConfidence): PlfProbe {
  if (confidence === "high") return "none";
  if (confidence === "medium") return "creative_stance";
  return "contrast_constraint";
}

export function classifySignalOutcome(
  confidence: PlfConfidence,
  aligned: boolean
): PlfClassification {
  if (confidence === "high" && aligned) return "valid";
  if (confidence === "medium" && aligned) return "valid";
  return "noise";
}

export function computePlfDecision(signals: PlfSignals, aligned: boolean): PlfDecision {
  const confidence = evaluateSignals(signals);
  const probe = generateLowCostProbe(confidence);
  return {
    confidence,
    probe,
    classification: classifySignalOutcome(confidence, aligned),
  };
}

