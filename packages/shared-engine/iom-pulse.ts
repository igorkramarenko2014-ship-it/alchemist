/**
 * IOM pulse + schism detector — **diagnostic merge only**.
 *
 * Merges Igor manifest digest with optional triad/WASM flags and optional **`SoeTriadSnapshot`**
 * (from your **`triad_run_*`** / gate log aggregates). **No** shadow governance: pure functions,
 * explicit **`schisms[]`** for operators; does **not** mutate gates, weights, or routes.
 */
import { BRAIN_SOE_THRESHOLDS } from "./brain-fusion-calibration.gen";
import {
  getIgorOrchestratorManifest,
  IOM_POLICY_CELL_MAX,
  type IgorOrchestratorManifest,
} from "./igor-orchestrator-layer";
import {
  computeSoeRecommendations,
  type SoeFusionHintCode,
  type SoeRecommendations,
  type SoeTriadSnapshot,
} from "./soe";

export const IOM_PULSE_VERSION = 2 as const;

export type IomSchismSeverity = "info" | "warn" | "critical";

export interface IomSchismFinding {
  code: string;
  severity: IomSchismSeverity;
  message: string;
  evidence?: Record<string, unknown>;
}

/** Structured operator cue — diagnostic only; does not execute or mutate gates. */
export interface IomSuggestion {
  /** Schism code or `soe_fusion:<code>`. */
  cellId: string;
  severity: IomSchismSeverity;
  message: string;
  action: string;
  /** 0–1 heuristic confidence for prioritization. */
  confidence: number;
  generatedAtMs: number;
  provenance: "iom_schism" | "soe_fusion_hint";
}

export interface IomPulseTriadFlags {
  triadFullyLive: boolean;
  anyPanelistLive: boolean;
  livePanelists: readonly string[];
}

export interface IOMPulseInput {
  triad?: IomPulseTriadFlags;
  wasmOk?: boolean;
  /** Aggregates from log pipeline — enables numeric schisms + SOE summary in pulse. */
  soeSnapshot?: SoeTriadSnapshot;
  /**
   * Optional **`getIOMCoverageReport` → `iomCoverageScore`** — passed into **`computeSoeRecommendations`**
   * when **`soeSnapshot`** is set (offline map quality for SOE message + suggestions).
   */
  iomCoverageScore?: number;
}

export interface IOMManifestDigest {
  layerVersion: number;
  brainFusionCalibrationVersion: number;
  packageCount: number;
  powerCellCount: number;
  policyCellMax: typeof IOM_POLICY_CELL_MAX;
  overPolicyCellBudget: boolean;
}

export interface IOMHealthPulseResult {
  pulseVersion: typeof IOM_PULSE_VERSION;
  generatedAtMs: number;
  manifestDigest: IOMManifestDigest;
  triad?: IomPulseTriadFlags;
  wasmOk?: boolean;
  soe?: Pick<
    SoeRecommendations,
    | "message"
    | "triadHealthScore"
    | "athenaSoeRecalibrationRecommended"
    | "fusionHintCodes"
    | "triadGovernance"
  >;
  schisms: IomSchismFinding[];
  /** Schism- and SOE-derived cues for dashboards / `pnpm iom:review` style tooling. */
  suggestions: IomSuggestion[];
  note: string;
}

export function digestIgorManifestForPulse(m: IgorOrchestratorManifest): IOMManifestDigest {
  const powerCellCount = m.sharedEnginePowerCells.length;
  return {
    layerVersion: m.layerVersion,
    brainFusionCalibrationVersion: m.brainFusionCalibrationVersion,
    packageCount: m.packages.length,
    powerCellCount,
    policyCellMax: IOM_POLICY_CELL_MAX,
    overPolicyCellBudget: powerCellCount > IOM_POLICY_CELL_MAX,
  };
}

/**
 * Heuristic schism detection on **supplied** aggregates — catches “silent degradation” patterns
 * (e.g. gate-heavy drops without API failures). No ML; thresholds align with **`BRAIN_SOE_THRESHOLDS`**.
 */
export function detectSchisms(
  input: IOMPulseInput,
  manifest: IgorOrchestratorManifest,
): IomSchismFinding[] {
  const out: IomSchismFinding[] = [];
  const th = BRAIN_SOE_THRESHOLDS;
  const digest = digestIgorManifestForPulse(manifest);

  if (digest.overPolicyCellBudget) {
    out.push({
      code: "IOM_CELL_POLICY_DRIFT",
      severity: "info",
      message:
        "Power cell count exceeds IOM_POLICY_CELL_MAX (12) — transmutation/consolidation backlog; machine sync may still allow rows until IOM_CELL_MAX is lowered.",
      evidence: { powerCellCount: digest.powerCellCount, policyCellMax: IOM_POLICY_CELL_MAX },
    });
  }

  if (input.triad?.anyPanelistLive && !input.triad.triadFullyLive) {
    out.push({
      code: "PARTIAL_TRIAD_VELOCITY",
      severity: "warn",
      message:
        "Partial live triad — governance blend skewed; prefer 3/3 keys for canonical ATHENA/HERMES/HESTIA telemetry or document intentional partial mode.",
      evidence: { livePanelists: [...input.triad.livePanelists] },
    });
  }

  if (input.wasmOk === false) {
    out.push({
      code: "WASM_EXPORT_OFF",
      severity: "info",
      message:
        "Browser WASM export unavailable — .fxp path degraded; see GET /api/health/wasm and packages/fxp-encoder build.",
    });
  }

  const s = input.soeSnapshot;
  if (s) {
    if (
      s.gateDropRate > th.gateDropForTighten &&
      s.triadFailureRate < th.triadFailureCeilingForTighten
    ) {
      out.push({
        code: "MODEL_GATE_DECOUPLE",
        severity: "warn",
        message:
          "High post-gate drop with low triad API failure — possible model/prompt drift (duplicates, distribution misses); review Slavic/Undercover + prompts before blaming providers.",
        evidence: {
          gateDropRate: s.gateDropRate,
          triadFailureRate: s.triadFailureRate,
          gateDropForTighten: th.gateDropForTighten,
          triadFailureCeilingForTighten: th.triadFailureCeilingForTighten,
        },
      });
    }

    if (
      s.triadStubRunFraction != null &&
      s.triadStubRunFraction > th.stubHeavyFusion &&
      input.triad?.anyPanelistLive
    ) {
      out.push({
        code: "STUB_LIVE_MISMATCH",
        severity: "warn",
        message:
          "Stub-heavy telemetry while keys suggest live routes — verify telemetry window vs deploy (stub vs fetcher parity).",
        evidence: { triadStubRunFraction: s.triadStubRunFraction, stubHeavyFusion: th.stubHeavyFusion },
      });
    }

    if (s.gateDropRate > 0.9 && s.triadFailureRate < 0.1) {
      out.push({
        code: "PIPELINE_SILENT_CHOKE",
        severity: "critical",
        message:
          "Severe gate drop (>90%) with low API failure — inspect Undercover, Slavic, legibility gates and recent param payloads (short arrays / schema drift).",
        evidence: { gateDropRate: s.gateDropRate, triadFailureRate: s.triadFailureRate },
      });
    }

    if (s.meanPanelistMs > th.meanPanelistMsLatency * 1.5 && s.triadFailureRate < 0.08) {
      out.push({
        code: "LATENCY_WITHOUT_STRESS",
        severity: "info",
        message:
          "High panelist wall time without matching failure rate — review TRIAD_PANELIST_CLIENT_TIMEOUT_MS / AI_TIMEOUT_MS and JSON payload size (paramArray).",
        evidence: { meanPanelistMs: s.meanPanelistMs, triadFailureRate: s.triadFailureRate },
      });
    }
  }

  return out;
}

const SCHISM_SUGGESTION_META: Record<
  string,
  { action: string; confidence: number; severity?: IomSchismSeverity }
> = {
  IOM_CELL_POLICY_DRIFT: {
    action: "pnpm igor:heal — consolidate or merge cells, then pnpm igor:sync",
    confidence: 0.78,
  },
  PARTIAL_TRIAD_VELOCITY: {
    action: "pnpm verify:keys — enable 3/3 live panelists or document partial triad mode",
    confidence: 0.82,
    severity: "warn",
  },
  WASM_EXPORT_OFF: {
    action: "pnpm build:wasm — restore fxp-encoder WASM for browser .fxp path",
    confidence: 0.74,
    severity: "info",
  },
  MODEL_GATE_DECOUPLE: {
    action: "pnpm test:real-gates — review Slavic/Undercover + prompts before blaming providers",
    confidence: 0.85,
    severity: "warn",
  },
  STUB_LIVE_MISMATCH: {
    action: "pnpm verify:keys — reconcile stub vs fetcher telemetry with deploy (see triad routes)",
    confidence: 0.8,
    severity: "warn",
  },
  PIPELINE_SILENT_CHOKE: {
    action: "pnpm test:real-gates && pnpm verify:harsh — inspect gates + param payloads",
    confidence: 0.9,
    severity: "critical",
  },
  LATENCY_WITHOUT_STRESS: {
    action: "pnpm verify:harsh — review TRIAD_PANELIST_CLIENT_TIMEOUT_MS / payload size",
    confidence: 0.72,
    severity: "info",
  },
};

const SOE_FUSION_SUGGESTION_META: Record<
  SoeFusionHintCode,
  { action: string; confidence: number; severity: IomSchismSeverity }
> = {
  STUB_PROD_PARITY: {
    action: "pnpm verify:keys — align stub vs live triad keys and telemetry window",
    confidence: 0.84,
    severity: "warn",
  },
  KEYS_AND_TIMEOUTS: {
    action: "pnpm verify:keys; check AI_TIMEOUT_MS / TRIAD_PANELIST_CLIENT_TIMEOUT_MS",
    confidence: 0.8,
    severity: "warn",
  },
  GATE_SOURCE_QC: {
    action: "pnpm test:real-gates — review Undercover + Slavic vs recent candidate payloads",
    confidence: 0.78,
    severity: "warn",
  },
  API_CONSTRAINT_ENTROPY: {
    action: "pnpm verify:harsh — review prompt bounds and candidate schema entropy",
    confidence: 0.72,
    severity: "info",
  },
  STRESSED_DUAL: {
    action: "pnpm verify:harsh — triad failure + gate drop elevated; check providers and gates",
    confidence: 0.86,
    severity: "critical",
  },
  LATENCY_PROMPT_UX: {
    action: "pnpm verify:harsh — trim param payloads / review panelist timeouts",
    confidence: 0.7,
    severity: "info",
  },
  GOVERNANCE_VELOCITY: {
    action: "Review triad-panel-governance vs brain calibration (SOE / product posture)",
    confidence: 0.68,
    severity: "info",
  },
  NOMINAL_VERIFY_MILE: {
    action: "pnpm harshcheck — routine verify before release",
    confidence: 0.55,
    severity: "info",
  },
};

function schismToSuggestion(s: IomSchismFinding, generatedAtMs: number): IomSuggestion {
  const row = SCHISM_SUGGESTION_META[s.code];
  return {
    cellId: s.code,
    severity: row?.severity ?? s.severity,
    message: s.message,
    action: row?.action ?? "pnpm verify:harsh — review recent triad + gate telemetry",
    confidence: row?.confidence ?? 0.65,
    generatedAtMs,
    provenance: "iom_schism",
  };
}

function soeFusionToSuggestion(
  code: SoeFusionHintCode,
  line: string,
  generatedAtMs: number,
): IomSuggestion {
  const row = SOE_FUSION_SUGGESTION_META[code];
  return {
    cellId: `soe_fusion:${code}`,
    severity: row.severity,
    message: line,
    action: row.action,
    confidence: row.confidence,
    generatedAtMs,
    provenance: "soe_fusion_hint",
  };
}

/** Merges static Igor manifest with live health flags and optional SOE snapshot. */
export function getIOMHealthPulse(input: IOMPulseInput): IOMHealthPulseResult {
  const generatedAtMs = Date.now();
  const manifest = getIgorOrchestratorManifest();
  const manifestDigest = digestIgorManifestForPulse(manifest);
  const schisms = detectSchisms(input, manifest);
  const suggestions: IomSuggestion[] = schisms.map((s) => schismToSuggestion(s, generatedAtMs));

  let soe: IOMHealthPulseResult["soe"];
  if (input.soeSnapshot) {
    const r = computeSoeRecommendations(input.soeSnapshot, {
      iomSchismCodes: schisms.map((x) => x.code),
      ...(input.iomCoverageScore != null && { iomCoverageScore: input.iomCoverageScore }),
    });
    soe = {
      message: r.message,
      triadHealthScore: r.triadHealthScore,
      athenaSoeRecalibrationRecommended: r.athenaSoeRecalibrationRecommended,
      fusionHintCodes: r.fusionHintCodes,
      triadGovernance: r.triadGovernance,
    };
    for (let i = 0; i < r.fusionHintCodes.length; i++) {
      const code = r.fusionHintCodes[i]!;
      const line = r.fusionHintLines[i] ?? "";
      suggestions.push(soeFusionToSuggestion(code, line, generatedAtMs));
    }
  }

  return {
    pulseVersion: IOM_PULSE_VERSION,
    generatedAtMs,
    manifestDigest,
    triad: input.triad,
    wasmOk: input.wasmOk,
    soe,
    schisms,
    suggestions,
    note:
      "IOM pulse — diagnostic merge; schisms + suggestions are explicit heuristics. No auto gate mutation. Pass soeSnapshot from stderr/log aggregates for full numeric schisms and SOE fusion cues.",
  };
}

export {
  getIOMCoverageReport,
  IOM_CELL_VITEST_MAP,
} from "./iom-coverage";
export type { IOMCoverageReport } from "./iom-coverage";
