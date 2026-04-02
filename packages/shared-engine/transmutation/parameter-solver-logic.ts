import type { Panelist } from "@alchemist/shared-types";
import {
  PolicyFamily,
  type TransmutationProfile,
  type TaskSchema,
  type ContextPack,
  type AuditTrace,
} from "./transmutation-types";
import { TRANSMUTATION_BOUNDS } from "./transmutation-bounds";

/**
 * Compute TransmutationProfile from policy, context, and hard bounds (browser-safe).
 * Clamps all outputs to TRANSMUTATION_BOUNDS after solve.
 * refineryOverrides: Pre-loaded manifest for MOVE 4 Calibrations.
 */
export function solveParameters(
  policy: PolicyFamily,
  task: TaskSchema,
  context: ContextPack,
  opts?: { refineryOverrides?: any }
): { profile: TransmutationProfile; audit: AuditTrace } {
  // Start from baseline
  const triad_weights = { ...TRANSMUTATION_BOUNDS.baseline_triad_weights };
  const gate_offsets = { slavic_threshold_delta: 0, novelty_gate_delta: 0 };
  const priors = { taste_weight: 0.06, corpus_affinity_weight: 0.45, lesson_weight: 0.5 };
  const context_injection: { lessons: string[]; cluster: string | null } = {
    lessons: context.lesson_matches.slice(0, TRANSMUTATION_BOUNDS.lesson_injection_limit),
    cluster: Object.keys(context.cluster_affinity)[0] || null,
  };
  const verification_profile = { aiom_strictness: 0.5, drift_tolerance: 0.07 };

  const deltas: string[] = [];
  const bounds_checks: string[] = [];

  // Apply policy-specific deltas
  switch (policy) {
    case PolicyFamily.CORPUS_LED: {
      const shift = Math.min(0.12, 0.08 + task.confidence * 0.04);
      triad_weights.DEEPSEEK += shift;
      // Redistribute weight to maintain sum = 1
      const redistribute = shift / 2;
      triad_weights.LLAMA -= redistribute;
      triad_weights.QWEN -= redistribute;
      priors.corpus_affinity_weight += 0.10;
      deltas.push(`ATHENA_WEIGHT +${shift.toFixed(3)}`, "CORPUS_PRIOR +0.10");
      break;
    }
    case PolicyFamily.TASTE_LED: {
      triad_weights.QWEN += 0.05;
      triad_weights.DEEPSEEK -= 0.025;
      triad_weights.LLAMA -= 0.025;
      const tBoost = Math.min(0.12, 0.08 + context.taste_prior_strength * 0.04);
      priors.taste_weight += tBoost;
      deltas.push("HESTIA_WEIGHT +0.05", `TASTE_PRIOR +${tBoost.toFixed(3)}`);
      break;
    }
    case PolicyFamily.SESSION_CONSISTENCY: {
      verification_profile.drift_tolerance = Math.max(
        TRANSMUTATION_BOUNDS.drift_tolerance_min,
        verification_profile.drift_tolerance - 0.02
      );
      deltas.push("DRIFT_TOLERANCE tightened");
      break;
    }
    case PolicyFamily.EXPLORATION: {
      gate_offsets.novelty_gate_delta += 0.01;
      priors.taste_weight = Math.max(0, priors.taste_weight - 0.02);
      deltas.push("NOVELTY_GATE +0.01", "TASTE_PRIOR reduced");
      break;
    }
    case PolicyFamily.GUARDED_AMBIGUITY: {
      verification_profile.aiom_strictness = 0.9;
      deltas.push("AIOM_STRICTNESS high");
      break;
    }
    case PolicyFamily.HUMANITARIAN: {
      verification_profile.aiom_strictness = 1.0;
      verification_profile.drift_tolerance = TRANSMUTATION_BOUNDS.drift_tolerance_min;
      deltas.push("HUMANITARIAN_LOCK: strict=1.0, drift=min");
      break;
    }
    case PolicyFamily.BASELINE_STATIC:
    default:
      // No deltas
      break;
  }

  // Apply Refinery Calibrations (MOVE 4)
  const manifest = opts?.refineryOverrides;
  if (manifest && Array.isArray(manifest.overrides)) {
    try {
      const cumulativeDriftManual: Record<string, number> = {};

      for (const entry of manifest.overrides) {
        // Match by policyFamily and (optionally) taskType
        if (entry.policyFamily === policy && (!entry.taskType || entry.taskType === task.task_type)) {
          const nudge = entry.nudge;
          
          // 1. Panelist Weight Nudges (±0.01-0.02)
          if (nudge.triad_weights) {
            for (const [p, delta] of Object.entries(nudge.triad_weights)) {
              const panelist = p as Panelist;
              const currentDrift = cumulativeDriftManual[`triad:${panelist}`] || 0;
              const allowed = 0.04 - currentDrift; // Budget cap
              const finalDelta = Math.min(allowed, delta as number);
              
              if (Math.abs(finalDelta) > 0.001) {
                triad_weights[panelist] += finalDelta;
                cumulativeDriftManual[`triad:${panelist}`] = currentDrift + finalDelta;
                deltas.push(`REFINERY: nudged ${panelist} by ${finalDelta.toFixed(3)}`);
              }
            }
          }

          // 2. Prior Weight Nudges (±0.02)
          if (nudge.priors) {
            for (const [key, delta] of Object.entries(nudge.priors)) {
              const pKey = key as keyof typeof priors;
              const currentDrift = cumulativeDriftManual[`prior:${pKey}`] || 0;
              const allowed = 0.04 - currentDrift;
              const finalDelta = Math.min(allowed, delta as number);

              if (Math.abs(finalDelta) > 0.001) {
                priors[pKey] += finalDelta;
                cumulativeDriftManual[`prior:${pKey}`] = currentDrift + finalDelta;
                deltas.push(`REFINERY: nudged ${pKey} by ${finalDelta.toFixed(3)}`);
              }
            }
          }

          // 3. Novelty Gate Nudge (±0.02)
          if (nudge.gate_offsets?.novelty_gate_delta) {
             const delta = nudge.gate_offsets.novelty_gate_delta;
             const currentDrift = cumulativeDriftManual["gate:novelty"] || 0;
             const finalDelta = Math.min(0.04 - currentDrift, delta);
             if (Math.abs(finalDelta) > 0.001) {
               gate_offsets.novelty_gate_delta += finalDelta;
               cumulativeDriftManual["gate:novelty"] = currentDrift + finalDelta;
               deltas.push(`REFINERY: nudged novelty_gate by ${finalDelta.toFixed(3)}`);
             }
          }
        }
      }
    } catch {
      // Fail-open: ignore corrupt refinery manifest
    }
  }

  // Clamping and normalization logic
  // 1. Clamp weights shift
  const panelists: Panelist[] = ["LLAMA", "DEEPSEEK", "QWEN"];
  for (const p of panelists) {
    const baseline = TRANSMUTATION_BOUNDS.baseline_triad_weights[p];
    const diff = triad_weights[p] - baseline;
    if (Math.abs(diff) > TRANSMUTATION_BOUNDS.triad_weight_shift_max) {
      triad_weights[p] = baseline + Math.sign(diff) * TRANSMUTATION_BOUNDS.triad_weight_shift_max;
      bounds_checks.push(`triad_weight_shift_max hit for ${p}`);
    }
  }

  // 2. Re-summarize weights to ensure sum = 1 (after clamping)
  const sum = triad_weights.LLAMA + triad_weights.DEEPSEEK + triad_weights.QWEN;
  triad_weights.LLAMA /= sum;
  triad_weights.DEEPSEEK /= sum;
  triad_weights.QWEN /= sum;

  // 3. Clamp priors
  if (priors.taste_weight > TRANSMUTATION_BOUNDS.taste_prior_max) {
    priors.taste_weight = TRANSMUTATION_BOUNDS.taste_prior_max;
    bounds_checks.push("taste_prior_max hit");
  }
  if (priors.corpus_affinity_weight > TRANSMUTATION_BOUNDS.corpus_prior_max + 0.45) {
     // base was 0.45, max delta 0.20
    priors.corpus_affinity_weight = 0.45 + TRANSMUTATION_BOUNDS.corpus_prior_max;
    bounds_checks.push("corpus_prior_max hit");
  }

  // 4. Clamp drift tolerance
  verification_profile.drift_tolerance = Math.max(
    TRANSMUTATION_BOUNDS.drift_tolerance_min,
    Math.min(TRANSMUTATION_BOUNDS.drift_tolerance_max, verification_profile.drift_tolerance)
  );

  const audit: AuditTrace = {
    policy_family: policy,
    reasons: [`TaskInterpret: ${task.task_type}`, `Confidence: ${task.confidence.toFixed(2)}`, `ContextDensity: ${context.corpus_density.toFixed(2)}`],
    deltas_applied: deltas,
    bounds_checks,
    confidence: task.confidence,
  };

  const profile: TransmutationProfile = {
    triad_weights,
    gate_offsets,
    priors,
    context_injection,
    verification_profile,
  };

  return { profile, audit };
}
