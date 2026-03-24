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
import { computeSoeRecommendations, type SoeRecommendations, type SoeTriadSnapshot } from "./soe";

export const IOM_PULSE_VERSION = 1 as const;

export type IomSchismSeverity = "info" | "warn" | "critical";

export interface IomSchismFinding {
  code: string;
  severity: IomSchismSeverity;
  message: string;
  evidence?: Record<string, unknown>;
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

/** Merges static Igor manifest with live health flags and optional SOE snapshot. */
export function getIOMHealthPulse(input: IOMPulseInput): IOMHealthPulseResult {
  const manifest = getIgorOrchestratorManifest();
  const manifestDigest = digestIgorManifestForPulse(manifest);
  const schisms = detectSchisms(input, manifest);

  let soe: IOMHealthPulseResult["soe"];
  if (input.soeSnapshot) {
    const r = computeSoeRecommendations(input.soeSnapshot);
    soe = {
      message: r.message,
      triadHealthScore: r.triadHealthScore,
      athenaSoeRecalibrationRecommended: r.athenaSoeRecalibrationRecommended,
      fusionHintCodes: r.fusionHintCodes,
      triadGovernance: r.triadGovernance,
    };
  }

  return {
    pulseVersion: IOM_PULSE_VERSION,
    generatedAtMs: Date.now(),
    manifestDigest,
    triad: input.triad,
    wasmOk: input.wasmOk,
    soe,
    schisms,
    note:
      "IOM pulse — diagnostic merge; schisms are explicit heuristics. No auto gate mutation. Pass soeSnapshot from stderr/log aggregates for full numeric schisms.",
  };
}
