/**
 * Self-Optimizing Engine (SOE) — **TypeScript product layer** for Alchemist.
 *
 * This is **not** audio DSP, AU/VST3, oversampling, or C++. It connects **triad
 * monitoring** + **gate pipeline** (Undercover distribution + Slavic dedup +
 * adversarial entropy) to **actionable hints** for ops and future auto-tuning.
 *
 * Wire real aggregates from your log pipeline (`triad_run_*` JSON lines) into
 * `computeSoeRecommendations`.
 */
import {
  ATHENA_SOE_RECALIBRATION_LINE,
  computeTriadGovernance,
} from "./triad-panel-governance";

export interface SoeTriadSnapshot {
  /** Mean panelist wall time (ms) over recent runs. */
  meanPanelistMs: number;
  /** 0–1 fraction of panelist calls that failed or timed out. */
  triadFailureRate: number;
  /** 0–1 fraction of raw candidates dropped after Undercover + Slavic + adversarial gates. */
  gateDropRate: number;
  /** Optional: mean end-to-end run time (ms). */
  meanRunMs?: number;
}

export interface SoeRecommendations {
  /** Suggest relaxing adversarial entropy floor (e.g. stuck empty results). */
  relaxAdversarialEntropy: boolean;
  /** Suggest tightening gates / reviewing model quality (junk flooding). */
  tightenGates: boolean;
  /** Human-readable summary for dashboards / logs. */
  message: string;
  /** Hint for prompt-guard max length (optional; product decision). */
  suggestedPromptMaxChars?: number;
  /** Triad Panel health [0,1] from governance weights (TS layer, not DSP). */
  triadHealthScore?: number;
  triadGovernance?: {
    presetFidelity: number;
    computationalVelocity: number;
    resourceFrugality: number;
  };
  /** True when computational velocity score is under 0.7 — Athena / SOE recalibration. */
  athenaSoeRecalibrationRecommended?: boolean;
}

const DEFAULT_PROMPT_MAX = 2000;

/**
 * Heuristic recommendations from aggregate telemetry. Pure function — safe in tests.
 */
export function computeSoeRecommendations(s: SoeTriadSnapshot): SoeRecommendations {
  const { meanPanelistMs, triadFailureRate, gateDropRate, meanRunMs } = s;

  let relaxAdversarialEntropy = false;
  let tightenGates = false;
  let message = "soe: nominal — within heuristic bands";
  let suggestedPromptMaxChars: number | undefined;

  // High API pain: back off validation aggressiveness slightly (ops choice to apply).
  if (triadFailureRate > 0.25) {
    relaxAdversarialEntropy = true;
    message =
      "soe: elevated triad failure rate — check provider health, timeouts, keys; consider relaxing entropy floor if results are empty";
  }

  // Models spew junk that gates catch: don't relax; investigate prompts/models.
  if (gateDropRate > 0.55 && triadFailureRate < 0.15) {
    tightenGates = true;
    message =
      "soe: heavy post-gate drop — Undercover/Slavic/adversarial stripping most candidates; review model or gate thresholds";
  }

  // Latency: shorter prompts reduce tokens (financial + wall clock).
  if (meanPanelistMs > 6500 || (meanRunMs != null && meanRunMs > 20_000)) {
    suggestedPromptMaxChars = Math.min(DEFAULT_PROMPT_MAX, 1200);
    message =
      "soe: high latency — consider shorter prompts (suggested max chars lowered) or faster providers";
  }

  if (triadFailureRate > 0.25 && gateDropRate > 0.55) {
    message =
      "soe: stressed — high failures and high gate drop; triage API errors before tuning gates";
  }

  const governance = computeTriadGovernance({
    meanPanelistMs,
    triadFailureRate,
    gateDropRate,
  });
  if (governance.athenaSoeRecalibrationRecommended) {
    message = `${message}\n${ATHENA_SOE_RECALIBRATION_LINE}`;
  }

  return {
    relaxAdversarialEntropy,
    tightenGates,
    message,
    triadHealthScore: governance.healthScore,
    triadGovernance: governance.scores,
    athenaSoeRecalibrationRecommended: governance.athenaSoeRecalibrationRecommended,
    ...(suggestedPromptMaxChars != null && { suggestedPromptMaxChars }),
  };
}
