/**
 * Transparent multi-stage arbitration (auditable; not a hidden “blackbox”).
 */
import type { AICandidate } from "@alchemist/shared-types";

/** Two improvement strategies the three stages vote on. */
export type ArbitrationStrategyId = "ALPHA" | "OMEGA";

export interface ArbitrationStageVote {
  stage: 1 | 2 | 3;
  /** Stage 2 is aware of stage 1’s vote; stage 3 of 1 and 2. */
  awareness: readonly (1 | 2)[];
  vote: ArbitrationStrategyId;
}

export interface ArbitrationContext {
  /** Optional prompt fingerprint for deterministic votes (no randomness). */
  prompt?: string;
  /** Correlate with triad run if desired. */
  runId?: string;
}

export interface TransparentArbitrationResult {
  winner: ArbitrationStrategyId;
  /** Three votes; majority (≥2) wins. */
  votes: readonly ArbitrationStageVote[];
  tally: { ALPHA: number; OMEGA: number };
  /** Same logical pool, ordered per **winning** strategy (still normal `AICandidate`). */
  orderedCandidates: AICandidate[];
}
