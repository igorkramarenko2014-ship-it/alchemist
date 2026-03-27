import type { AICandidate } from "@alchemist/shared-types";

export type ProbeClassification = "strong" | "weak" | "uncertain";

export interface ProbeResult {
  signal: string;
  responseQuality: number;
  classification: ProbeClassification;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function avgScore(candidates: AICandidate[]): number {
  if (candidates.length === 0) return 0;
  return candidates.reduce((a, c) => a + c.score, 0) / candidates.length;
}

/**
 * Probe Intelligence Layer:
 * low-cost pre-decision confidence primitive from existing run signals.
 */
export function evaluateProbeResult(input: {
  signal: string;
  candidates: AICandidate[];
  triadFailureRate: number;
  gateDropRate: number;
}): ProbeResult {
  const quality =
    0.45 * avgScore(input.candidates) +
    0.3 * (1 - clamp01(input.triadFailureRate)) +
    0.25 * (1 - clamp01(input.gateDropRate));
  const responseQuality = clamp01(quality);
  const classification: ProbeClassification =
    responseQuality >= 0.72 ? "strong" : responseQuality >= 0.45 ? "uncertain" : "weak";
  return {
    signal: input.signal,
    responseQuality,
    classification,
  };
}

