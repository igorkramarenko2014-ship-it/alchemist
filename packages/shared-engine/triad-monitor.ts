/**
 * Triad monitoring — structured activity + latency for cost/ops (not audio DSP).
 * Emits JSON lines via `logEvent` (stderr / serverless-friendly).
 */
import type { Panelist } from "@alchemist/shared-types";
import { ATHENA_SOE_RECALIBRATION_LINE, PANELIST_ALCHEMIST_CODENAME } from "./triad-panel-governance";
import { logEvent } from "./telemetry";

function nowMs(): number {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
}

export function newTriadRunId(): string {
  return `triad_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export type TriadRunMode = "fetcher" | "stub" | "tablebase" | "unconfigured";

/** Optional Engine School prompt suffix telemetry — attach only when callers build `learningContext`. */
export type TriadRunLearningContextUsed = {
  injected: boolean;
  selectedLessonIds: string[];
};

export function logTriadRunStart(
  runId: string,
  meta: {
    promptLen: number;
    mode: TriadRunMode;
    learningContextUsed?: TriadRunLearningContextUsed;
  },
): void {
  logEvent("triad_run_start", { runId, ...meta });
}

export type TriadPanelistStatus = "ok" | "timeout" | "error";

/** Per-panelist wall time (for $/latency dashboards when wired to billing). */
export function logTriadPanelistEnd(
  runId: string,
  panelist: Panelist,
  status: TriadPanelistStatus,
  durationMs: number,
  extra?: { candidateCount?: number; message?: string; estimatedTokens?: number }
): void {
  logEvent("triad_panelist_end", {
    runId,
    panelist,
    alchemistCodename: PANELIST_ALCHEMIST_CODENAME[panelist],
    status,
    durationMs: Math.round(durationMs),
    ...extra,
  });
}

/** Emitted when governance marks computational velocity stress (Athena / SOE path). */
export function logAthenaSoeRecalibration(
  meta: Record<string, unknown> & { runId?: string; healthScore?: number }
): void {
  logEvent("athena_soe_recalibration", {
    message: ATHENA_SOE_RECALIBRATION_LINE,
    ...meta,
  });
}

export function logTriadRunEnd(
  runId: string,
  durationMs: number,
  meta: {
    mode: TriadRunMode;
    rawCandidateCount: number;
    afterGateCount: number;
    /** Weighted Triad Panel health [0,1] — TypeScript governance, not DSP. */
    triadHealthScore?: number;
    triadGovernanceScores?: {
      presetFidelity: number;
      computationalVelocity: number;
      resourceFrugality: number;
    };
    triadParityMode?: string;
    triadDegraded?: boolean;
  }
): void {
  logEvent("triad_run_end", {
    runId,
    durationMs: Math.round(durationMs),
    ...meta,
  });
}

/** Wrap a panelist call with timing + status logging (O(1) bookkeeping per call). */
export async function withTriadPanelistTiming<T>(
  runId: string,
  panelist: Panelist,
  fn: () => Promise<T>
): Promise<{ value: T; durationMs: number }> {
  const t0 = nowMs();
  try {
    const value = await fn();
    const ms = nowMs() - t0;
    const count = Array.isArray(value) ? value.length : undefined;
    logTriadPanelistEnd(runId, panelist, "ok", ms, {
      candidateCount: count,
    });
    return { value, durationMs: ms };
  } catch (reason) {
    const ms = nowMs() - t0;
    const msg = reason instanceof Error ? reason.message : String(reason);
    const status: TriadPanelistStatus = /timeout/i.test(msg) ? "timeout" : "error";
    logTriadPanelistEnd(runId, panelist, status, ms, { message: msg });
    throw reason;
  }
}

export { nowMs };
