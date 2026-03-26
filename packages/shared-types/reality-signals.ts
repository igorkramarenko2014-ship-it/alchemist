/**
 * Reality Loop Layer (RLL) — **ground truth signal** contracts.
 *
 * These types describe **observed product behavior** (used / modified / discarded / export),
 * not gate law. Telemetry must stay **minimal**: hashes and enums — **no raw prompts** in payloads
 * (see `docs/reality-loop-layer.md`, `alchemist-security-posture.mdc`).
 */

/** Same wire values as `Panelist` — duplicated to avoid circular imports with `index.ts`. */
export type RealitySignalPanelist = "LLAMA" | "DEEPSEEK" | "QWEN";

/** Product / triad exploration posture (policy flag only — does not relax TS gates by itself). */
export type RealityExploreMode = "explore" | "exploit";

/**
 * Stable `logEvent` names for RLL — prefix `alchemist_` for SIEM grep.
 * Wire these through `logRealitySignal` in shared-engine (redaction + stderr JSON).
 */
export const REALITY_TELEMETRY_EVENTS = {
  OUTPUT_USED: "alchemist_output_used",
  OUTPUT_MODIFIED: "alchemist_output_modified",
  OUTPUT_DISCARDED: "alchemist_output_discarded",
  EXPORT_ATTEMPTED: "alchemist_export_attempted",
  EXPORT_SUCCEEDED: "alchemist_export_succeeded",
} as const;

export type RealityTelemetryEventName =
  (typeof REALITY_TELEMETRY_EVENTS)[keyof typeof REALITY_TELEMETRY_EVENTS];

/** Common optional correlation fields — never include raw user text. */
export interface RealitySignalBase {
  runId?: string;
  /** Short hash of normalized prompt when correlating to triad runs. */
  promptHash?: string;
  sessionId?: string;
  provenance?: string;
}

export interface AlchemistOutputUsedPayload extends RealitySignalBase {
  surface: "dock" | "export" | "share" | "vst_bridge" | "unknown";
  candidateRank?: number;
  panelist?: RealitySignalPanelist;
}

export interface AlchemistOutputModifiedPayload extends RealitySignalBase {
  surface: "dock" | "export" | "param_editor" | "unknown";
  /** Coarse buckets only — not full edit diff. */
  editKind?: "param_tweak" | "reasoning_edit" | "other";
}

export interface AlchemistOutputDiscardedPayload extends RealitySignalBase {
  surface: "dock" | "export" | "unknown";
  reason?: "user_dismissed" | "gate_rejected" | "timeout" | "other";
}

export interface AlchemistExportAttemptedPayload extends RealitySignalBase {
  wasmAvailable: boolean;
  candidateRank?: number;
  panelist?: RealitySignalPanelist;
}

export interface AlchemistExportSucceededPayload extends RealitySignalBase {
  exportTrustTier: "verified" | "unverified";
  wasmReal: boolean;
  candidateRank?: number;
  panelist?: RealitySignalPanelist;
}

/**
 * Rollup passed into **`SoeTriadSnapshot.realityGroundTruth`** from log pipelines.
 * **Hints only** — SOE may append human-readable guidance; gates never read this.
 */
export interface RealityGroundTruthAggregate {
  /** Number of outcome events in the window (used for gating hint text). */
  sampleWindowEvents: number;
  outputUsedCount?: number;
  outputModifiedCount?: number;
  outputDiscardedCount?: number;
}
