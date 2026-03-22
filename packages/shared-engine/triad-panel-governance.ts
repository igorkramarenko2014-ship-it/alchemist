/**
 * Triad Panel governance — **TypeScript product layer** (not audio DSP / C++).
 *
 * **Greek codenames** are stable **Alchemist branding** for logs and UI. Wire IDs
 * (`LLAMA` | `DEEPSEEK` | `QWEN`) stay in JSON for routes and scoring; codenames
 * are added alongside for human-readable telemetry.
 *
 * Weights below map **Preset Fidelity / Computational Velocity / Resource Frugality**
 * to measurable triad signals: gate survival, inverse latency, API success.
 */
import type { Panelist } from "@alchemist/shared-types";

/** Canonical governance weights (sum = 1). “Alchemist Prime” panel spec. */
export interface TriadPanelWeights {
  /** Survivors after Undercover + Slavic + adversarial gates (preset pipeline integrity). */
  presetFidelity: number;
  /** Wall-clock efficiency of panelist round-trips (not sample-rate / THD). */
  computationalVelocity: number;
  /** API / failure frugality (1 − failure rate). */
  resourceFrugality: number;
}

/** Default 45% / 35% / 20% — applied to *scores* in [0,1], not raw DSP metrics. */
export const DEFAULT_TRIAD_GOVERNANCE_WEIGHTS: TriadPanelWeights = {
  presetFidelity: 0.45,
  computationalVelocity: 0.35,
  resourceFrugality: 0.2,
};

/**
 * Alternate weighting (40 / 35 / 25) for docs / dashboards — same score axes as above.
 * Efficiency ↔ velocity, “analog integrity” ↔ fidelity, “filter curve” ↔ Slavic gate survival (fidelity).
 */
export const ALT_TRIAD_GOVERNANCE_WEIGHTS_EFFICIENCY: TriadPanelWeights = {
  presetFidelity: 0.35,
  computationalVelocity: 0.4,
  resourceFrugality: 0.25,
};

/** Public log line when SOE recommends recalibration (velocity / efficiency stress). */
export const ATHENA_SOE_RECALIBRATION_LINE =
  "[ATHENA_SOE_ACTIVE]: Recalibrating Triad Weights...";

/**
 * Panelist → Alchemist codename. DEEPSEEK carries highest blend weight → **Athena** (lead).
 * LLAMA → **Hermes** (fast path). QWEN → **Hestia** (gatekeeper / third voice).
 */
export const PANELIST_ALCHEMIST_CODENAME: Record<Panelist, string> = {
  DEEPSEEK: "ATHENA",
  LLAMA: "HERMES",
  QWEN: "HESTIA",
};

export interface TriadGovernanceInput {
  meanPanelistMs: number;
  triadFailureRate: number;
  gateDropRate: number;
}

export interface TriadGovernanceResult {
  weights: TriadPanelWeights;
  /** Component scores in [0, 1]. */
  scores: {
    presetFidelity: number;
    computationalVelocity: number;
    resourceFrugality: number;
  };
  /** Weighted health in [0, 1]. */
  healthScore: number;
  /**
   * When true, “Athena” (SOE lead) recommends recalibration — computational velocity
   * component fell below 0.7 (product analogue of “efficiency stress”).
   */
  athenaSoeRecalibrationRecommended: boolean;
}

const MS_AT_V0 = 18_000;
const MS_AT_V1 = 800;

function clamp01(x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  return x;
}

/** Map mean panelist latency to a velocity score: fast → high, very slow → low. */
export function velocityScoreFromMeanPanelistMs(meanPanelistMs: number): number {
  if (!Number.isFinite(meanPanelistMs) || meanPanelistMs <= 0) return 1;
  const t = clamp01((meanPanelistMs - MS_AT_V1) / (MS_AT_V0 - MS_AT_V1));
  return clamp01(1 - t);
}

/**
 * Full Triad Panel health from aggregate or single-run telemetry.
 * Fidelity = 1 − gateDropRate. Frugality = 1 − triadFailureRate.
 */
export function computeTriadGovernance(
  input: TriadGovernanceInput,
  weights: TriadPanelWeights = DEFAULT_TRIAD_GOVERNANCE_WEIGHTS
): TriadGovernanceResult {
  const presetFidelity = clamp01(1 - clamp01(input.gateDropRate));
  const computationalVelocity = velocityScoreFromMeanPanelistMs(input.meanPanelistMs);
  const resourceFrugality = clamp01(1 - clamp01(input.triadFailureRate));

  const healthScore = clamp01(
    presetFidelity * weights.presetFidelity +
      computationalVelocity * weights.computationalVelocity +
      resourceFrugality * weights.resourceFrugality
  );

  return {
    weights,
    scores: { presetFidelity, computationalVelocity, resourceFrugality },
    healthScore,
    athenaSoeRecalibrationRecommended: computationalVelocity < 0.7,
  };
}
