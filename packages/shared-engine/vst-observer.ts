/**
 * **VST / Serum bridge — diagnostic surface only** (IOM `vst_observer` cell).
 *
 * - Does **not** watch folders or push `.fxp` by itself; operators / `pnpm vst:observe` drive updates.
 * - **HARD GATE:** any real bytes must pass **`tools/validate-offsets.py`** on a real init `.fxp` before ship;
 *   this module only carries **typed state + telemetry** for `iomPulse`.
 * - Future: optional `triggerSync()` in a **Node-only** script may copy validated output — still human-gated / explicit CLI.
 */
import { logEvent } from "./telemetry";

export type VstObserverStance = "CONSOLIDATE" | "DISRUPT";

/** Runtime config for a future Node hook (not used in browser bundles). */
export interface VstObserverConfig {
  serumUserPresetPath: string;
  trialFileName: string;
  watchDir: string;
  iomStance: VstObserverStance;
  /** Must stay true for any path that writes `.fxp`. */
  hardGateValidation: boolean;
  logEventFn?: (event: string, payload: Record<string, unknown>) => void;
}

export interface VstSyncResult {
  success: boolean;
  fxpPath: string;
  validated: boolean;
  pushedAt: string;
  schism?: string;
  provenance: string;
}

/** Slice merged into **`getIOMHealthPulse()`** for dashboards. */
export interface VstSyncStatusPulse {
  lastSync: string | null;
  lastResult: VstSyncResult | null;
  stance: VstObserverStance;
  pendingTrial: boolean;
}

let stance: VstObserverStance = "CONSOLIDATE";
let lastResult: VstSyncResult | null = null;

export function setVstObserverStance(next: VstObserverStance): void {
  stance = next;
}

export function getVstObserverStance(): VstObserverStance {
  return stance;
}

/**
 * Record the outcome of an explicit sync attempt (CLI / future daemon). Updates pulse + stderr JSON.
 */
export function recordVstObserverSync(result: VstSyncResult): void {
  lastResult = result;
  logEvent("iom_vst_sync", {
    success: result.success,
    validated: result.validated,
    fxpPath: result.fxpPath,
    pushedAt: result.pushedAt,
    schism: result.schism ?? null,
    provenance: result.provenance,
    stance,
    aliasEvent: "vst_observer_push",
    note: "IOM vst_observer — descriptive only; operator-triggered; no gate mutation.",
  });
}

export function resetVstObserverStateForTests(): void {
  stance = "CONSOLIDATE";
  lastResult = null;
}

export function getVstObserverPulseSlice(): VstSyncStatusPulse {
  const pendingTrial =
    lastResult?.success === true &&
    lastResult.validated === true &&
    lastResult.fxpPath.length > 0;
  return {
    lastSync: lastResult?.pushedAt ?? null,
    lastResult,
    stance,
    pendingTrial,
  };
}
