import type { AICandidate, Panelist } from "@alchemist/shared-types";

export type CandidateRepairStage = "none" | "clamp" | "schema";
export type CandidateScoringStage = "slavic" | "intent" | "combined";

/**
 * IOM finalizer principle:
 * one state object per stage, single explicit finalization point.
 */
export interface CandidatePipelineState {
  readonly raw: AICandidate;
  readonly repaired: AICandidate;
  readonly final: AICandidate;
  readonly provenance: {
    repairedAt: CandidateRepairStage;
    scoredBy: CandidateScoringStage;
    panelist: Panelist;
    revision: number;
  };
}

export interface FinalizeCandidatesOptions {
  scoreFloor?: number;
  maxCandidates?: number;
  predicate?: (candidate: AICandidate) => boolean;
}

export function finalizeCandidates(
  states: CandidatePipelineState[],
  options: FinalizeCandidatesOptions = {}
): AICandidate[] {
  const scoreFloor = options.scoreFloor ?? 0;
  const maxCandidates = options.maxCandidates ?? Number.POSITIVE_INFINITY;
  const predicate = options.predicate ?? (() => true);

  return states
    .filter((s) => s.final.score >= scoreFloor)
    .filter((s) => predicate(s.final))
    .sort((a, b) => b.final.score - a.final.score)
    .slice(0, maxCandidates)
    .map((s) => ({
      ...s.final,
      // audit-only attachment; not required by shared-types consumers.
      _provenance: s.provenance,
    })) as AICandidate[];
}
