/**
 * Self-Optimizing Engine (SOE) — **TypeScript product layer** for Alchemist.
 *
 * This is **not** audio DSP, AU/VST3, oversampling, or C++. It connects **triad
 * monitoring** + **gate pipeline** (Undercover distribution + Slavic dedup +
 * adversarial entropy) to **actionable hints** for ops and future auto-tuning.
 *
 * Wire real aggregates from your log pipeline (`triad_run_*` JSON lines) into
 * `computeSoeRecommendations`.
 *
 * **Fusion hints (`soe_fusion:*`):** copy + numeric thresholds from **`docs/brain.md` §9a** via
 * **`brain-fusion-calibration.gen.ts`** (`pnpm brain:sync`). Aligned with **agent skills**
 * (inner-circle, **alchemist-security-posture**, extra-mile verify). **No** chat transcripts,
 * **no** PII, **no** DSP — hints only.
 */
import {
  BRAIN_SOE_FUSION_HINTS,
  BRAIN_SOE_RECOMMENDATION_MESSAGES,
  BRAIN_SOE_THRESHOLDS,
} from "./brain-fusion-calibration.gen";
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
  /**
   * Optional: 0–1 fraction of recent triad runs that used **stub** panelists (telemetry).
   * When high, fusion hints flag **stub vs prod** parity (security posture).
   */
  triadStubRunFraction?: number;
}

/** Stable fusion codes for dashboards / SIEM (deterministic from snapshot; no PII). */
export type SoeFusionHintCode =
  | "STUB_PROD_PARITY"
  | "KEYS_AND_TIMEOUTS"
  | "GATE_SOURCE_QC"
  | "API_CONSTRAINT_ENTROPY"
  | "STRESSED_DUAL"
  | "LATENCY_PROMPT_UX"
  | "GOVERNANCE_VELOCITY"
  | "NOMINAL_VERIFY_MILE";

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
  /** Agent-skill–aligned operator hints (same order as `fusionHintLines`). */
  fusionHintCodes: SoeFusionHintCode[];
  /** One human line per code — `soe_fusion:` prefix for grep. */
  fusionHintLines: string[];
}

function buildSoeFusionHints(
  s: SoeTriadSnapshot,
  o: {
    relaxAdversarialEntropy: boolean;
    tightenGates: boolean;
    suggestedPromptMaxChars?: number;
    athenaSoeRecalibrationRecommended: boolean;
  }
): { fusionHintCodes: SoeFusionHintCode[]; fusionHintLines: string[] } {
  const th = BRAIN_SOE_THRESHOLDS;
  const hint = BRAIN_SOE_FUSION_HINTS;
  const rows: { code: SoeFusionHintCode; line: string }[] = [];

  if (s.triadStubRunFraction != null && s.triadStubRunFraction > th.stubHeavyFusion) {
    rows.push({
      code: "STUB_PROD_PARITY",
      line: hint.STUB_PROD_PARITY,
    });
  }

  if (s.triadFailureRate > th.triadFailureForKeysHint) {
    rows.push({
      code: "KEYS_AND_TIMEOUTS",
      line: hint.KEYS_AND_TIMEOUTS,
    });
  }

  if (o.tightenGates) {
    rows.push({
      code: "GATE_SOURCE_QC",
      line: hint.GATE_SOURCE_QC,
    });
  }

  if (s.triadFailureRate > th.dualStressFailure && s.gateDropRate > th.dualStressGateDrop) {
    rows.push({
      code: "STRESSED_DUAL",
      line: hint.STRESSED_DUAL,
    });
  }

  if (o.relaxAdversarialEntropy) {
    rows.push({
      code: "API_CONSTRAINT_ENTROPY",
      line: hint.API_CONSTRAINT_ENTROPY,
    });
  }

  if (o.suggestedPromptMaxChars != null) {
    rows.push({
      code: "LATENCY_PROMPT_UX",
      line: hint.LATENCY_PROMPT_UX,
    });
  }

  if (o.athenaSoeRecalibrationRecommended) {
    rows.push({
      code: "GOVERNANCE_VELOCITY",
      line: hint.GOVERNANCE_VELOCITY,
    });
  }

  if (rows.length === 0) {
    rows.push({
      code: "NOMINAL_VERIFY_MILE",
      line: hint.NOMINAL_VERIFY_MILE,
    });
  }

  const seen = new Set<SoeFusionHintCode>();
  const fusionHintCodes: SoeFusionHintCode[] = [];
  const fusionHintLines: string[] = [];
  for (const r of rows) {
    if (seen.has(r.code)) continue;
    seen.add(r.code);
    fusionHintCodes.push(r.code);
    fusionHintLines.push(r.line);
  }
  return { fusionHintCodes, fusionHintLines };
}

/**
 * Heuristic recommendations from aggregate telemetry. Pure function — safe in tests.
 */
export function computeSoeRecommendations(s: SoeTriadSnapshot): SoeRecommendations {
  const { meanPanelistMs, triadFailureRate, gateDropRate, meanRunMs } = s;
  const th = BRAIN_SOE_THRESHOLDS;
  const msg = BRAIN_SOE_RECOMMENDATION_MESSAGES;

  let relaxAdversarialEntropy = false;
  let tightenGates = false;
  let message: string = msg.nominal;
  let suggestedPromptMaxChars: number | undefined;

  // Order matches historical `soe.ts`: independent `if` blocks; later branches overwrite `message`.
  // High API pain: back off validation aggressiveness slightly (ops choice to apply).
  if (triadFailureRate > th.triadFailureForRelax) {
    relaxAdversarialEntropy = true;
    message = msg.elevatedFailure;
  }

  // Models spew junk that gates catch: don't relax; investigate prompts/models.
  if (
    gateDropRate > th.gateDropForTighten &&
    triadFailureRate < th.triadFailureCeilingForTighten
  ) {
    tightenGates = true;
    message = msg.heavyGateDrop;
  }

  // Latency: shorter prompts reduce tokens (financial + wall clock).
  if (
    meanPanelistMs > th.meanPanelistMsLatency ||
    (meanRunMs != null && meanRunMs > th.meanRunMsLatency)
  ) {
    suggestedPromptMaxChars = Math.min(th.defaultPromptMax, th.latencySuggestedPromptMax);
    message = msg.highLatency;
  }

  if (triadFailureRate > th.dualStressFailure && gateDropRate > th.dualStressGateDrop) {
    message = msg.stressed;
  }

  const governance = computeTriadGovernance({
    meanPanelistMs,
    triadFailureRate,
    gateDropRate,
  });
  if (governance.athenaSoeRecalibrationRecommended) {
    message = `${message}\n${ATHENA_SOE_RECALIBRATION_LINE}`;
  }

  const { fusionHintCodes, fusionHintLines } = buildSoeFusionHints(s, {
    relaxAdversarialEntropy,
    tightenGates,
    suggestedPromptMaxChars,
    athenaSoeRecalibrationRecommended: governance.athenaSoeRecalibrationRecommended,
  });

  return {
    relaxAdversarialEntropy,
    tightenGates,
    message,
    triadHealthScore: governance.healthScore,
    triadGovernance: governance.scores,
    athenaSoeRecalibrationRecommended: governance.athenaSoeRecalibrationRecommended,
    fusionHintCodes,
    fusionHintLines,
    ...(suggestedPromptMaxChars != null && { suggestedPromptMaxChars }),
  };
}
