import type { EvidenceBucket, RefineryOverrideEntry, RefineryNudge } from "./refinery-types";
import { PolicyFamily } from "../transmutation-types";

/**
 * MOVE 4 Calibrator
 * Logic to calculate parameter "Nudges" based on Regret (1 - alignment).
 * Nudges are strictly Signal-only (no strictness or hard gates).
 */
export function calibrateRefinery(evidence: EvidenceBucket[]): RefineryOverrideEntry[] {
  const proposals: RefineryOverrideEntry[] = [];
  const now = new Date().toISOString();

  for (const bucket of evidence) {
    // Only calibrate 'applied' buckets (where transmutation actually influenced ranking)
    if (bucket.status !== "applied") continue;
    if (bucket.policyFamily === PolicyFamily.BASELINE_STATIC) continue;

    const regret = 1 - bucket.meanAlignment;
    const gain = bucket.meanAlignmentGainV1;

    // Regret Threshold: > 0.3 means we are missing the mark
    // Gain Threshold: < 0.05 means transmutation isn't contributing much value
    if (regret > 0.3 || gain < 0.05) {
      const nudge = calculateNudgeForPolicy(bucket);
      if (nudge) {
        proposals.push({
          policyFamily: bucket.policyFamily,
          taskType: bucket.taskType,
          nudge,
          provenance: {
            sampleCount: bucket.sampleCount,
            meanAlignment: bucket.meanAlignment,
            meanGain: bucket.meanAlignmentGainV1,
            timestamp: now,
            version: 1
          }
        });
      }
    }
  }

  return proposals;
}

/**
 * Deterministic Nudge Selection
 * Restricted to: triad_weights, priors, gate_offsets.novelty_gate_delta.
 */
function calculateNudgeForPolicy(bucket: EvidenceBucket): RefineryNudge | null {
  const nudge: RefineryNudge = {};

  switch (bucket.policyFamily) {
    case PolicyFamily.CORPUS_LED:
      // If alignment is low, maybe the corpus prior is too aggressive or the weight shift is off
      nudge.priors = { corpus_affinity_weight: -0.02 };
      nudge.triad_weights = { DEEPSEEK: -0.01, LLAMA: 0.01 };
      break;

    case PolicyFamily.TASTE_LED:
      // Nudge toward LLAMA/DEEPSEEK if HESTIA (QWEN) isn't aligning in this cluster
      nudge.priors = { taste_weight: -0.02 };
      nudge.triad_weights = { QWEN: -0.01, DEEPSEEK: 0.01 };
      break;

    case PolicyFamily.EXPLORATION:
      // Reduce novelty bump if alignment is low for a specific task
      nudge.gate_offsets = { novelty_gate_delta: -0.02 };
      break;

    default:
      return null;
  }

  return nudge;
}
