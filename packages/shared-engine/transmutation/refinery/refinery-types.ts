import type { Panelist } from "@alchemist/shared-types";
import type { PolicyFamily, TransmutationTaskType } from "../transmutation-types";

/**
 * MOVE 4 — Evidence Bucket
 * Aggregated telemetry grouped by policy and task context.
 */
export interface EvidenceBucket {
  policyFamily: PolicyFamily;
  taskType: TransmutationTaskType;
  cluster: string | null;
  status: "applied" | "fallback_baseline";
  
  sampleCount: number;
  meanAlignment: number;
  meanAlignmentConfidence: number;
  meanAlignmentGainV1: number;
}

/**
 * MOVE 4 — Refinery Nudge
 * Restricted Signal-only deltas allowed for calibration.
 * No aiom_strictness or hard bounds permitted.
 */
export interface RefineryNudge {
  triad_weights?: Partial<Record<Panelist, number>>;
  priors?: {
    taste_weight?: number;
    corpus_affinity_weight?: number;
    lesson_weight?: number;
  };
  gate_offsets?: {
    novelty_gate_delta?: number;
  };
}

/**
 * MOVE 4 — Refinery Override Entry
 * A single approved nudge with its provenance.
 */
export interface RefineryOverrideEntry {
  policyFamily: PolicyFamily;
  taskType?: TransmutationTaskType; // Optional: can be global to policy
  nudge: RefineryNudge;
  provenance: {
    sampleCount: number;
    meanAlignment: number;
    meanGain: number;
    timestamp: string;
    version: number;
  };
}

/**
 * MOVE 4 — Refinery Overrides Manifest
 * The schema for refinery-overrides.json.
 */
export interface RefineryOverridesManifest {
  version: number; // Increment on every 'refinery:apply'
  lastUpdateUtc: string;
  overrides: RefineryOverrideEntry[];
  cumulativeDriftCache: Record<string, number>; // Tracked per parameter
}

/**
 * MOVE 4.5 — Refinery Snapshot
 * A frozen set of proposals for operator review.
 */
export interface RefinerySnapshot {
  id: string; // e.g. "snap_20260331_1430"
  createdAtUtc: string;
  proposals: Array<RefineryOverrideEntry & { id: string }>;
}
