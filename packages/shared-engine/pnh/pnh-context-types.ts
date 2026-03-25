/**
 * PNH runtime context — **typed inputs** for adaptive policy (no hidden globals).
 */
import type { TriadParityMode } from "@alchemist/shared-types";

/** Where triad intent is evaluated (server API vs local stub). */
export type PnhTriadLane = "stub" | "mixed" | "fully_live" | "unconfigured_http";

export type PnhVerifyMode = "ci" | "local" | "selective" | "unknown";

export type PnhRiskLevel = "low" | "elevated" | "critical";

export type PnhEnvironmentClass = "safe" | "uncertain" | "hostile";

export type PnhAdaptiveAction = "allow" | "warn" | "degrade" | "block";

/** Signals for **`evaluatePnhContext`** — all optional; missing → neutral assumptions. */
export interface PnhContextInput {
  triadParityMode?: TriadParityMode | "unknown";
  triadFullyLive?: boolean | null;
  /** Count of active IOM schisms (e.g. `iomPulse.schisms.length`). */
  iomSchismCount?: number;
  verifyMode?: PnhVerifyMode;
  /**
   * Session / edge counter of PNH-class rejections — **caller-supplied**; shared-engine does not
   * persist this (no shadow server memory in v1).
   */
  pnhRepeatTriggersSession?: number;
  taxonomySize?: number;
  wasmReal?: boolean;
}

export interface PnhContextEvaluation {
  riskLevel: PnhRiskLevel;
  environment: PnhEnvironmentClass;
}

export interface PnhAdaptiveDecision {
  action: PnhAdaptiveAction;
  reason: string;
  /** Stable scenario id for telemetry when mapped from intent reasons. */
  scenarioId?: "GATE_BYPASS_PAYLOAD" | "PROMPT_HIJACK_TRIAD" | "SLAVIC_SWARM_CREDIT_DRAIN";
}
