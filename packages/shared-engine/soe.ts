/**
 * Self-Optimizing Engine (SOE) — **TypeScript product layer** for Alchemist.
 *
 * This is **not** audio DSP, AU/VST3, oversampling, or C++. It connects **triad
 * monitoring** + **gate pipeline** (Undercover distribution + Slavic dedup +
 * adversarial entropy) to **actionable hints** for ops and future auto-tuning.
 *
 * Wire real aggregates from your log pipeline (`triad_run_*` JSON lines) into
 * `computeSoeRecommendations`. Optional second argument **`SoeRecommendationsContext`**
 * can pass **`iomSchismCodes`** and **`iomCoverageScore`** (Vitest↔power-cell map) to enrich
 * **`message`** and **`iomAffectedCellIds`**; use **`logSoeIomContext`** → **`soe_iom_context`**
 * and **`logSoeHintWithIomContext`** for auditable stderr JSON.
 *
 * **Fusion hints (`soe_fusion:*`):** copy + numeric thresholds from **`docs/brain.md` §9a** via
 * **`brain-fusion-calibration.gen.ts`** (`pnpm brain:sync`). Aligned with **agent skills**
 * (inner-circle, **alchemist-security-posture**, extra-mile verify). **No** chat transcripts,
 * **no** PII, **no** DSP — hints only.
 */
import type { RealityGroundTruthAggregate } from "@alchemist/shared-types";
import {
  BRAIN_SOE_FUSION_HINTS,
  BRAIN_SOE_RECOMMENDATION_MESSAGES,
  BRAIN_SOE_THRESHOLDS,
} from "./brain-fusion-calibration.gen";
import { getAffectedIomCellsFromSchismCodes } from "./iom-schism-impact";
import {
  ATHENA_SOE_RECALIBRATION_LINE,
  computeTriadGovernance,
} from "./triad-panel-governance";
import { logEvent } from "./telemetry";

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
  /**
   * Optional rollups from RLL / ground-truth telemetry (`docs/reality-loop-layer.md`).
   * **Hints only** — gates do not read this; SOE may append adoption guidance to `message`.
   */
  realityGroundTruth?: RealityGroundTruthAggregate;
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
  /** Distinct power cell ids when `iomSchismCodes` was supplied (IOM impact trace). */
  iomAffectedCellIds?: string[];
  /** Schism codes echoed from optional compute context. */
  iomSchismCodesEcho?: string[];
  /** `iomAffectedCellIds.length` — quick prioritization signal. */
  iomImpactCellCount?: number;
  /** Echo of **`SoeRecommendationsContext.iomCoverageScore`** when supplied. */
  iomCoverageScoreEcho?: number;
}

/** Optional offline / diagnostic context — never changes gate math. */
export interface SoeRecommendationsContext {
  /** Current or hypothetical IOM schism codes (e.g. from `detectSchisms`). */
  iomSchismCodes?: readonly string[];
  /**
   * **`getIOMCoverageReport` → `iomCoverageScore`** (0–1). When set with schisms or below 1,
   * appended to **`message`** for operator triangulation.
   */
  iomCoverageScore?: number;
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

function appendIomImpactToMessage(
  message: string,
  schismCodes: readonly string[],
  affectedCells: string[],
  coverageScore?: number,
): string {
  if (schismCodes.length === 0 || affectedCells.length === 0) return message;
  const sch = schismCodes.slice(0, 6).join(", ");
  const schEll = schismCodes.length > 6 ? "…" : "";
  const cells = affectedCells.slice(0, 8).join(", ");
  const cellEll = affectedCells.length > 8 ? "…" : "";
  const cov =
    coverageScore != null ? `; test↔cell coverage ${coverageScore.toFixed(2)}` : "";
  return `${message} | IOM impact: ${affectedCells.length} cell(s) [${cells}${cellEll}] ← schisms: ${sch}${schEll}${cov}`;
}

/**
 * Optional stderr JSON when SOE was computed with IOM schism context — call from jobs / calibration.
 */
export function logSoeHintWithIomContext(
  rec: SoeRecommendations,
  meta?: Record<string, unknown>
): void {
  if (
    (!rec.iomAffectedCellIds || rec.iomAffectedCellIds.length === 0) &&
    (!rec.iomSchismCodesEcho || rec.iomSchismCodesEcho.length === 0)
  ) {
    return;
  }
  logEvent("soe_hint_with_iom_context", {
    fusionHintCodes: rec.fusionHintCodes,
    messageHead: rec.message.split("\n")[0]?.slice(0, 240) ?? "",
    iomAffectedCellIds: rec.iomAffectedCellIds,
    iomSchismCodes: rec.iomSchismCodesEcho,
    iomImpactCellCount: rec.iomImpactCellCount,
    iomCoverageScore: rec.iomCoverageScoreEcho,
    ...meta,
    note: "SOE + IOM schism→cell map — hints only; deployer applies changes.",
  });
}

/**
 * Structured **`soe_iom_context`** line when SOE was computed with IOM schism and/or coverage context.
 */
export function logSoeIomContext(
  rec: SoeRecommendations,
  context: { iomCoverageScore?: number; iomSchismCodes?: readonly string[] },
  meta?: Record<string, unknown>,
): void {
  const codes = context.iomSchismCodes?.filter((c) => c.length > 0) ?? [];
  const hasCov = context.iomCoverageScore != null;
  if (codes.length === 0 && !hasCov) return;
  logEvent("soe_iom_context", {
    fusionHintCodes: rec.fusionHintCodes,
    messageHead: rec.message.split("\n")[0]?.slice(0, 320) ?? "",
    iomSchismCodes: codes.length > 0 ? [...codes].sort() : rec.iomSchismCodesEcho,
    iomAffectedCellIds: rec.iomAffectedCellIds,
    iomImpactCellCount: rec.iomImpactCellCount,
    iomCoverageScore: context.iomCoverageScore ?? rec.iomCoverageScoreEcho,
    ...meta,
    note: "SOE + IOM contextual weighting — hints only; no gate mutation.",
  });
}

/**
 * FIRE / ops: **`soe_iom_fusion`** — SOE lines + IOM schism/coverage context (calibration, dashboards).
 */
export function logSoeIomFusion(
  rec: SoeRecommendations,
  context: { iomCoverageScore?: number; iomSchismCodes?: readonly string[] },
  meta?: Record<string, unknown>,
): void {
  const codes = context.iomSchismCodes?.filter((c) => c.length > 0) ?? [];
  const hasCov = context.iomCoverageScore != null;
  if (codes.length === 0 && !hasCov) return;
  logEvent("soe_iom_fusion", {
    fusionHintCodes: rec.fusionHintCodes,
    fusionHintLineSample: rec.fusionHintLines[0]?.slice(0, 280) ?? "",
    messageHead: rec.message.split("\n")[0]?.slice(0, 320) ?? "",
    iomSchismCodes: codes.length > 0 ? [...codes].sort() : rec.iomSchismCodesEcho,
    iomAffectedCellIds: rec.iomAffectedCellIds,
    iomImpactCellCount: rec.iomImpactCellCount,
    iomCoverageScore: context.iomCoverageScore ?? rec.iomCoverageScoreEcho,
    ...meta,
    note: "SOE + IOM fusion hints — heuristic; deployer applies. No gate mutation.",
  });
}

/**
 * Heuristic recommendations from aggregate telemetry. Pure function — safe in tests.
 * Pass **`context.iomSchismCodes`** to append IOM responsibility impact to **`message`**.
 */
export function computeSoeRecommendations(
  s: SoeTriadSnapshot,
  context?: SoeRecommendationsContext
): SoeRecommendations {
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

  const schismCodes = context?.iomSchismCodes?.filter((c) => c.length > 0) ?? [];
  const affectedCells = getAffectedIomCellsFromSchismCodes(schismCodes);
  const cov = context?.iomCoverageScore;
  if (schismCodes.length > 0 && affectedCells.length > 0) {
    message = appendIomImpactToMessage(message, schismCodes, affectedCells, cov);
  } else if (cov != null && cov < 1 && schismCodes.length === 0) {
    message = `${message} | IOM test↔cell coverage: ${cov.toFixed(2)} (run full pnpm verify:harsh before merge if selective)`;
  } else if (cov != null && schismCodes.length > 0 && affectedCells.length === 0) {
    const sch = schismCodes.slice(0, 6).join(", ");
    const schEll = schismCodes.length > 6 ? "…" : "";
    message = `${message} | IOM schisms: ${sch}${schEll} (no mapped power cells)${cov != null ? `; coverage ${cov.toFixed(2)}` : ""}`;
  }

  const rg = s.realityGroundTruth;
  if (rg && rg.sampleWindowEvents >= 20) {
    const u = rg.outputUsedCount ?? 0;
    const m = rg.outputModifiedCount ?? 0;
    const d = rg.outputDiscardedCount ?? 0;
    const denom = u + m + d;
    if (denom >= 10) {
      const usedRate = u / denom;
      if (usedRate < 0.15) {
        message = `${message}\nReality signal: low output adoption (${(usedRate * 100).toFixed(0)}% marked used in window — product/ops review; hints only).`;
      }
    }
  }

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
    ...(schismCodes.length > 0 && {
      iomSchismCodesEcho: [...schismCodes].sort(),
      ...(affectedCells.length > 0 && {
        iomAffectedCellIds: affectedCells,
        iomImpactCellCount: affectedCells.length,
      }),
    }),
    ...(cov != null && { iomCoverageScoreEcho: cov }),
  };
}
