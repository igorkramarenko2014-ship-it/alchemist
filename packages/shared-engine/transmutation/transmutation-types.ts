import type { Panelist } from "@alchemist/shared-types";

/**
 * Transmutation Module Phases:
 * Phase 1 (deterministic): advisory only; no engine side-effects.
 * Phase 2 (reactive): wires into scoreCandidates / triad weights.
 */

export type TransmutationTaskType =
  | "pluck"
  | "pad"
  | "bass"
  | "lead"
  | "fx"
  | "texture"
  | "riser"
  | "noise"
  | "unknown";

export type TransmutationMood =
  | "dark"
  | "bright"
  | "warm"
  | "metallic"
  | "aggressive"
  | "soft"
  | "gritty"
  | "clean";

export interface TaskSchema {
  task_type: TransmutationTaskType;
  target_mood: TransmutationMood[];
  genre_affinity: string[];
  mix_role?: string;
  /** 0-1: how much the user wants something "different" vs "consistent". */
  novelty_preference: number;
  /** 0-1: relative weight of explicit reference vs general exploration. */
  reference_strength: number;
  /** 0-1: density of cues resolved from the prompt. */
  confidence: number;
  /** Inverse of confidence: 1 - confidence. */
  ambiguity_score: number;
}

export interface ContextPack {
  lesson_matches: string[];
  /** dominant cluster IDs -> affinity score 0-1. */
  cluster_affinity: Record<string, number>;
  recent_exports_count: number;
  /** 0-1: confidence from taste-index. */
  taste_prior_strength: number;
  /** 0-1: ratio of matched lessons to total lessons. */
  corpus_density: number;
}

export enum PolicyFamily {
  BASELINE_STATIC = "BASELINE_STATIC",
  CORPUS_LED = "CORPUS_LED",
  TASTE_LED = "TASTE_LED",
  SESSION_CONSISTENCY = "SESSION_CONSISTENCY",
  EXPLORATION = "EXPLORATION",
  GUARDED_AMBIGUITY = "GUARDED_AMBIGUITY",
  HUMANITARIAN = "HUMANITARIAN",
}

export interface TransmutationProfile {
  triad_weights: Record<Panelist, number>;
  gate_offsets: {
    slavic_threshold_delta: number;
    novelty_gate_delta: number;
  };
  priors: {
    taste_weight: number;
    corpus_affinity_weight: number;
    lesson_weight: number;
  };
  context_injection: {
    lessons: string[];
    cluster: string | null;
  };
  verification_profile: {
    aiom_strictness: number;
    drift_tolerance: number;
  };
}

export interface AuditTrace {
  policy_family: PolicyFamily;
  reasons: string[];
  deltas_applied: string[];
  bounds_checks: string[];
  confidence: number;
}

export interface TransmutationResult {
  transmutation_profile: TransmutationProfile;
  audit_trace: AuditTrace;
  confidence: number;
  fallback_used: boolean;
}
