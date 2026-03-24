/**
 * Igor orchestrator **power layer** — auditable map of monorepo modules under brain §9c / Apex stance.
 * Cursor ethos + this manifest are **not** law: canon stays FIRESTARTER, HARD GATE, dsp-vs-ts, security posture.
 */
import { BRAIN_FUSION_CALIBRATION_VERSION } from "./brain-fusion-calibration.gen";
import { IGOR_SHARED_ENGINE_POWER_CELLS_GEN } from "./igor-orchestrator-cells.gen";
import { IGOR_ORCHESTRATOR_PACKAGES_GEN } from "./igor-orchestrator-packages.gen";
import { logEvent } from "./telemetry";

/** Bumped when manifest semantics change (packages/cells generation, shape). */
export const IGOR_ORCHESTRATOR_LAYER_VERSION = 3 as const;

/** Human doc anchor (metaphor); tooling: `.cursor/rules/alchemist-apex-orchestrator.mdc`. */
export const IGOR_APEX_STANCE_REF = "docs/brain.md §9c";

export interface IgorOrchestratorPackagePower {
  packageName: string;
  pathFromRepoRoot: string;
  role: string;
  canonAnchors: readonly string[];
}

export interface IgorOrchestratorPowerCell {
  id: string;
  responsibility: string;
  artifacts: readonly string[];
}

/** Workspace packages — `pnpm igor:sync` scans `apps/*` + `packages/*` and merges `igor-orchestrator-meta.json`. */
const PACKAGES: readonly IgorOrchestratorPackagePower[] =
  IGOR_ORCHESTRATOR_PACKAGES_GEN as unknown as readonly IgorOrchestratorPackagePower[];

/** Power cells — `pnpm igor:sync` reads `igor-power-cells.json` → `igor-orchestrator-cells.gen.ts`. */
export const IGOR_SHARED_ENGINE_POWER_CELLS: readonly IgorOrchestratorPowerCell[] =
  IGOR_SHARED_ENGINE_POWER_CELLS_GEN as unknown as readonly IgorOrchestratorPowerCell[];

export interface IgorOrchestratorManifest {
  layerVersion: typeof IGOR_ORCHESTRATOR_LAYER_VERSION;
  brainFusionCalibrationVersion: typeof BRAIN_FUSION_CALIBRATION_VERSION;
  apexStanceRef: typeof IGOR_APEX_STANCE_REF;
  note: string;
  packages: readonly IgorOrchestratorPackagePower[];
  sharedEnginePowerCells: readonly IgorOrchestratorPowerCell[];
}

export function getIgorOrchestratorManifest(): IgorOrchestratorManifest {
  return {
    layerVersion: IGOR_ORCHESTRATOR_LAYER_VERSION,
    brainFusionCalibrationVersion: BRAIN_FUSION_CALIBRATION_VERSION,
    apexStanceRef: IGOR_APEX_STANCE_REF,
    note:
      "Igor orchestrator power layer: igor:sync (packages + igor-power-cells.json → .gen.ts). Does not override gates or types; see brain.md §9c and alchemist-apex-orchestrator.mdc.",
    packages: PACKAGES,
    sharedEnginePowerCells: IGOR_SHARED_ENGINE_POWER_CELLS,
  };
}

/** Optional ops line — same transport as other `logEvent` JSON on stderr. */
export function logIgorOrchestratorManifest(extra?: Record<string, unknown>): void {
  const m = getIgorOrchestratorManifest();
  logEvent("igor_orchestrator_manifest", {
    layerVersion: m.layerVersion,
    brainFusionCalibrationVersion: m.brainFusionCalibrationVersion,
    packageCount: m.packages.length,
    powerCellCount: m.sharedEnginePowerCells.length,
    ...extra,
    note: m.note,
  });
}
