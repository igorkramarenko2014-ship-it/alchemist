import type { Panelist } from "@alchemist/shared-types";

/**
 * AIOM Phase 1: Hard bounds for the advisory Transmutation module.
 */
export const TRANSMUTATION_BOUNDS = {
  /** Maximum shift for any single panelist weight from its baseline (0.12). */
  triad_weight_shift_max: 0.12,
  /** Maximum delta for Slavic cosine threshold (0.03). */
  single_threshold_delta_max: 0.03,
  /** Maximum taste-prior boost (0.12). */
  taste_prior_max: 0.12,
  /** Maximum corpus-affinity boost (0.20). */
  corpus_prior_max: 0.20,
  /** Maximum number of injected context lessons (2). */
  lesson_injection_limit: 2,
  /** Maximum exploration delta (0.18 for novelty). */
  exploration_max: 0.18,
  /** Minimum drift tolerance (strictness). */
  drift_tolerance_min: 0.04,
  /** Maximum drift tolerance (looseness). */
  drift_tolerance_max: 0.10,

  /** Triad baseline (matches constants.ts PANELIST_WEIGHTS). */
  baseline_triad_weights: {
    LLAMA: 0.35, // HERMES
    DEEPSEEK: 0.4, // ATHENA
    QWEN: 0.25, // HESTIA
  } as Record<Panelist, number>,
};
