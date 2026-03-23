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
 * **Fusion hints (`soe_fusion:*`):** deterministic operator lines aligned with repo **agent
 * skills** (inner-circle collaboration stance, **alchemist-security-posture**, extra-mile
 * verify). **No** chat transcripts, **no** PII, **no** DSP — hints only.
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

const DEFAULT_PROMPT_MAX = 2000;
const STUB_HEAVY_FUSION = 0.35;

function buildSoeFusionHints(
  s: SoeTriadSnapshot,
  o: {
    relaxAdversarialEntropy: boolean;
    tightenGates: boolean;
    suggestedPromptMaxChars?: number;
    athenaSoeRecalibrationRecommended: boolean;
  }
): { fusionHintCodes: SoeFusionHintCode[]; fusionHintLines: string[] } {
  const rows: { code: SoeFusionHintCode; line: string }[] = [];

  if (s.triadStubRunFraction != null && s.triadStubRunFraction > STUB_HEAVY_FUSION) {
    rows.push({
      code: "STUB_PROD_PARITY",
      line:
        "soe_fusion: stub-heavy telemetry — parity risk: verify:keys, test:real-gates; never treat stub as prod (security posture; gate identity stub===fetcher)",
    });
  }

  if (s.triadFailureRate > 0.2) {
    rows.push({
      code: "KEYS_AND_TIMEOUTS",
      line:
        "soe_fusion: triad failures — check keys, provider health, 8s / Qwen timeouts before retuning gates (degraded-infra + clear inputs)",
    });
  }

  if (o.tightenGates) {
    rows.push({
      code: "GATE_SOURCE_QC",
      line:
        "soe_fusion: heavy gate drop — review prompt specificity + model output; source-hygiene for the pipeline, not silent Slavic/Undercover bypass",
    });
  }

  if (s.triadFailureRate > 0.25 && s.gateDropRate > 0.55) {
    rows.push({
      code: "STRESSED_DUAL",
      line:
        "soe_fusion: dual stress — high failures + high gate drop; triage API/keys before tuning entropy or gates (matches SOE stressed message)",
    });
  }

  if (o.relaxAdversarialEntropy) {
    rows.push({
      code: "API_CONSTRAINT_ENTROPY",
      line:
        "soe_fusion: API strain — entropy relax is ops-only after empty-run proof; Undercover/Slavic must behave identically stub vs fetcher",
    });
  }

  if (o.suggestedPromptMaxChars != null) {
    rows.push({
      code: "LATENCY_PROMPT_UX",
      line:
        "soe_fusion: latency — shorter prompts + honest UI wait state (async expectation; not fake instant triad)",
    });
  }

  if (o.athenaSoeRecalibrationRecommended) {
    rows.push({
      code: "GOVERNANCE_VELOCITY",
      line:
        "soe_fusion: governance velocity stress — read wall time vs gate-drop together; ATHENA SOE path is telemetry governance, not buffer DSP",
    });
  }

  if (rows.length === 0) {
    rows.push({
      code: "NOMINAL_VERIFY_MILE",
      line:
        "soe_fusion: nominal — extra mile: harshcheck on triad touches; document WASM + offset validation in PRs; agent tone after canon",
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
