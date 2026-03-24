import { env } from "@/env";
import {
  getAffectedIomCellsFromSchismCodes,
  getIgorOrchestratorManifest,
  getIOMHealthPulse,
} from "@alchemist/shared-engine";
import { Gauge, Registry } from "prom-client";
import { countIomPendingHealProposals, tryLoadIomCoverageReport } from "./iom-ops-core";

/** Dedicated registry so default Node metrics are not mixed in (IOM-only scrape). */
const register = new Registry();

export const IOM_PROMETHEUS_CONTENT_TYPE = register.contentType;

const iomCoverageScore = new Gauge({
  name: "alchemist_iom_coverage_score",
  help: "Vitest to power-cell coverage (0–1). Zero when coverage could not be computed on this host.",
  registers: [register],
});

const iomCoverageAvailable = new Gauge({
  name: "alchemist_iom_coverage_available",
  help: "1 if alchemist_iom_coverage_score is from a real getIOMCoverageReport run, else 0.",
  registers: [register],
});

const iomSchismsTotal = new Gauge({
  name: "alchemist_iom_schisms_total",
  help: "Count of IOM schism findings in the current pulse.",
  registers: [register],
});

const iomSchismsBySeverity = new Gauge({
  name: "alchemist_iom_schisms_by_severity",
  help: "Schism count by severity (info, warn, critical).",
  labelNames: ["severity"],
  registers: [register],
});

const iomPowerCellsTotal = new Gauge({
  name: "alchemist_iom_power_cells_total",
  help: "Registered Igor power cells (shared-engine manifest).",
  registers: [register],
});

const iomLayerVersion = new Gauge({
  name: "alchemist_iom_igor_layer_version",
  help: "IGOR_ORCHESTRATOR_LAYER_VERSION from manifest.",
  registers: [register],
});

const iomBrainFusionCalibrationVersion = new Gauge({
  name: "alchemist_iom_brain_fusion_calibration_version",
  help: "Brain §9a fusion calibration gen version.",
  registers: [register],
});

const iomPendingProposals = new Gauge({
  name: "alchemist_iom_pending_heal_proposals",
  help: "Lines with kind iom_ghost_cell in tools/iom-proposals.jsonl (when file is readable).",
  registers: [register],
});

const iomTriadFullyLive = new Gauge({
  name: "alchemist_iom_triad_fully_live",
  help: "1 if all three panelist keys are configured, else 0.",
  registers: [register],
});

const iomWasmAvailable = new Gauge({
  name: "alchemist_iom_wasm_available",
  help: "1 if GET /api/health/wasm reports available, else 0.",
  registers: [register],
});

const iomCellSchismAffected = new Gauge({
  name: "alchemist_iom_cell_schism_affected",
  help: "1 if current schism→cell map touches this power cell id, else 0.",
  labelNames: ["cell_id"],
  registers: [register],
});

const iomPulseVersion = new Gauge({
  name: "alchemist_iom_pulse_version",
  help: "IOM_PULSE_VERSION from shared-engine.",
  registers: [register],
});

async function wasmOkFromRequest(requestUrl: string): Promise<boolean> {
  const wasmUrl = new URL("/api/health/wasm", requestUrl);
  try {
    const wasmRes = await fetch(wasmUrl, { cache: "no-store" });
    const wasm = await wasmRes.json();
    const rec =
      typeof wasm === "object" && wasm !== null ? (wasm as Record<string, unknown>) : null;
    return rec?.ok === true && rec?.status === "available";
  } catch {
    return false;
  }
}

/**
 * Prometheus text exposition for IOM — **read-only**, same triad/WASM inputs as **`/api/health`** pulse.
 */
export async function collectIomPrometheusText(requestUrl: string): Promise<string> {
  const wasmOk = await wasmOkFromRequest(requestUrl);

  const deepseekLive = env.deepseekApiKey.length > 0;
  const qwenLive = env.qwenApiKey.length > 0;
  const llamaLive = env.llamaApiKey.length > 0;
  const anyLive = deepseekLive || qwenLive || llamaLive;
  const allLive = deepseekLive && qwenLive && llamaLive;
  const liveList = [
    deepseekLive ? "deepseek" : null,
    qwenLive ? "qwen" : null,
    llamaLive ? "llama" : null,
  ].filter(Boolean) as string[];

  const pulse = getIOMHealthPulse({
    triad: {
      triadFullyLive: allLive,
      anyPanelistLive: anyLive,
      livePanelists: liveList,
    },
    wasmOk,
  });
  const manifest = getIgorOrchestratorManifest();
  const covRep = tryLoadIomCoverageReport();
  const covAvailable = "iomCoverageScore" in covRep;
  const covScore = covAvailable ? covRep.iomCoverageScore : 0;

  const crit = pulse.schisms.filter((s) => s.severity === "critical").length;
  const warn = pulse.schisms.filter((s) => s.severity === "warn").length;
  const info = pulse.schisms.filter((s) => s.severity === "info").length;

  iomCoverageAvailable.set(covAvailable ? 1 : 0);
  iomCoverageScore.set(covScore);
  iomSchismsTotal.set(pulse.schisms.length);
  iomSchismsBySeverity.set({ severity: "critical" }, crit);
  iomSchismsBySeverity.set({ severity: "warn" }, warn);
  iomSchismsBySeverity.set({ severity: "info" }, info);
  iomPowerCellsTotal.set(manifest.sharedEnginePowerCells.length);
  iomLayerVersion.set(manifest.layerVersion);
  iomBrainFusionCalibrationVersion.set(manifest.brainFusionCalibrationVersion);
  iomPendingProposals.set(countIomPendingHealProposals());
  iomTriadFullyLive.set(allLive ? 1 : 0);
  iomWasmAvailable.set(wasmOk ? 1 : 0);
  iomPulseVersion.set(pulse.pulseVersion);

  const schismCodes = pulse.schisms.map((s) => s.code);
  const affectedCells = new Set(getAffectedIomCellsFromSchismCodes(schismCodes));
  for (const cell of manifest.sharedEnginePowerCells) {
    iomCellSchismAffected.set({ cell_id: cell.id }, affectedCells.has(cell.id) ? 1 : 0);
  }

  return register.metrics();
}
