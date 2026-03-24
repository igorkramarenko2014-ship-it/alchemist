/**
 * **JUCE VST wrapper** — diagnostic pulse slice only (`vst_wrapper` Igor cell).
 *
 * The native plugin cannot call TypeScript `logEvent`. Operators may:
 * - tail stderr / a log file written by the plugin, or
 * - call **`recordVstWrapperPulseHint()`** from a sidecar script after parsing logs.
 */
import { logEvent } from "./telemetry";

export type VstWrapperLoadResult = "success" | "failed" | null;

export type VstWrapperStance = "CONSOLIDATE" | "DISRUPT";

export interface VstWrapperStatusPulse {
  lastFxpLoaded: string | null;
  lastLoadResult: VstWrapperLoadResult;
  watchFolder: string;
  /** True when a sidecar reports the Rust `watcher-daemon` PID or similar (default false). */
  daemonRunning: boolean;
  stance: VstWrapperStance;
  lastMessage: string | null;
}

let lastFxpLoaded: string | null = null;
let lastLoadResult: VstWrapperLoadResult = null;
let watchFolder = "";
let daemonRunning = false;
let stance: VstWrapperStance = "CONSOLIDATE";
let lastMessage: string | null = null;

export function setVstWrapperWatchFolder(path: string): void {
  watchFolder = path;
}

export function setVstWrapperStance(next: VstWrapperStance): void {
  stance = next;
}

export function setVstWrapperDaemonRunning(on: boolean): void {
  daemonRunning = on;
}

/** Optional bridge from log pipelines / sidecars (not called from JUCE). */
export function recordVstWrapperPulseHint(payload: {
  path?: string | null;
  result?: VstWrapperLoadResult;
  message?: string | null;
  provenance?: string;
}): void {
  if (payload.path !== undefined) lastFxpLoaded = payload.path;
  if (payload.result !== undefined) lastLoadResult = payload.result;
  if (payload.message !== undefined) lastMessage = payload.message;
  logEvent("iom_vst_wrapper_status", {
    lastFxpLoaded,
    lastLoadResult,
    watchFolder,
    daemonRunning,
    stance,
    lastMessage,
    provenance: payload.provenance ?? "vst_wrapper_pulse",
    note: "Diagnostic merge — JUCE plugin logs separately to stderr/file.",
  });
}

export function resetVstWrapperPulseForTests(): void {
  lastFxpLoaded = null;
  lastLoadResult = null;
  watchFolder = "";
  daemonRunning = false;
  stance = "CONSOLIDATE";
  lastMessage = null;
}

export function getVstWrapperPulseSlice(): VstWrapperStatusPulse {
  return {
    lastFxpLoaded,
    lastLoadResult,
    watchFolder,
    daemonRunning,
    stance,
    lastMessage,
  };
}
