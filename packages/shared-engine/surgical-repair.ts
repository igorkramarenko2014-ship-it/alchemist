/**
 * **Surgical repair** — `vst_observer` support: auditable **clamp-style** fixes on
 * **`AICandidate`** payloads only. Does **not** bypass HARD GATE, Slavic, Undercover,
 * or encoder logic. Intended to run **after** HARD GATE green, **before** encode/push
 * (when that pipeline is wired).
 */
import type { AICandidate } from "@alchemist/shared-types";
import { logEvent } from "./telemetry";
import type { VstSyncResult } from "./vst-observer";

const EXCESSIVE_REPAIR_THRESHOLD = 5;

/** IOM-shaped schism (avoid importing `iom-pulse` — cycle). */
export interface SurgicalRepairSchismPulse {
  code: "VST_SURGICAL_REPAIR_HEAVY";
  severity: "warn";
  message: string;
  evidence?: Record<string, unknown>;
}

let pendingHeavyRepairSchism: SurgicalRepairSchismPulse | null = null;

export interface RepairOptions {
  /** Clamp `paramArray` values to [0, 1]. */
  clampParams: boolean;
  /** Minimum reasoning length (pad in `CLAMP` mode; log-only in `LOG_ONLY`). */
  enforceReasoningMinChars: number;
  /** `CLAMP` applies fixes; `LOG_ONLY` records would-be repairs without mutating. */
  mode: "CLAMP" | "LOG_ONLY";
  provenance: string;
}

export interface RepairResult {
  repairedCandidate: AICandidate | null;
  repairsApplied: string[];
  success: boolean;
  note?: string;
}

const DEFAULT_OPTIONS: RepairOptions = {
  clampParams: true,
  enforceReasoningMinChars: 15,
  mode: "CLAMP",
  provenance: "vst_observer",
};

function candidateFingerprint(c: AICandidate): string {
  return `${c.panelist}:${c.description?.slice(0, 24) ?? c.reasoning.slice(0, 24)}`;
}

function queueHeavyRepairSchism(repairsCount: number): void {
  if (repairsCount > EXCESSIVE_REPAIR_THRESHOLD) {
    pendingHeavyRepairSchism = {
      code: "VST_SURGICAL_REPAIR_HEAVY",
      severity: "warn",
      message:
        `Surgical repair applied more than ${EXCESSIVE_REPAIR_THRESHOLD} clamp-style fixes in one session — review candidate source / gates before relying on VST push.`,
      evidence: { repairsCount, threshold: EXCESSIVE_REPAIR_THRESHOLD },
    };
  }
}

/**
 * Drain queued schisms from the last **heavy** surgical-repair session (diagnostic).
 * Clears the queue so a single pulse consumption matches one repair burst.
 */
export function drainSurgicalRepairSchisms(): SurgicalRepairSchismPulse[] {
  if (!pendingHeavyRepairSchism) return [];
  const s = pendingHeavyRepairSchism;
  pendingHeavyRepairSchism = null;
  return [s];
}

export function resetSurgicalRepairStateForTests(): void {
  pendingHeavyRepairSchism = null;
}

/**
 * Clamp / log-only repair on an already gate-valid candidate (VST-bound path).
 */
export function performSurgicalRepair(
  candidate: AICandidate,
  options: Partial<RepairOptions> = {},
): RepairResult {
  const opts: RepairOptions = { ...DEFAULT_OPTIONS, ...options };
  const repairs: string[] = [];
  const clone = (): AICandidate =>
    typeof structuredClone === "function"
      ? structuredClone(candidate)
      : { ...candidate, state: { ...candidate.state }, paramArray: candidate.paramArray?.slice() };

  try {
    const working = opts.mode === "CLAMP" ? clone() : { ...candidate };

    if (opts.clampParams && working.paramArray && Array.isArray(working.paramArray)) {
      const originalLength = working.paramArray.length;
      if (opts.mode === "CLAMP") {
        working.paramArray = working.paramArray.map((v, idx) => {
          if (typeof v !== "number" || Number.isNaN(v)) {
            repairs.push(`param[${idx}]: non-numeric → 0.5`);
            return 0.5;
          }
          const clampedVal = Math.max(0, Math.min(1, v));
          if (Math.abs(clampedVal - v) > 1e-9) {
            repairs.push(`param[${idx}]: ${v.toFixed(4)} → ${clampedVal.toFixed(4)} (clamped)`);
          }
          return clampedVal;
        });
      } else {
        working.paramArray.forEach((v, idx) => {
          if (typeof v !== "number" || Number.isNaN(v)) {
            repairs.push(`param[${idx}]: would set non-numeric → 0.5 (LOG_ONLY)`);
            return;
          }
          const clampedVal = Math.max(0, Math.min(1, v));
          if (Math.abs(clampedVal - v) > 1e-9) {
            repairs.push(`param[${idx}]: would clamp ${v.toFixed(4)} → ${clampedVal.toFixed(4)} (LOG_ONLY)`);
          }
        });
      }
      if (opts.mode === "CLAMP" && working.paramArray.length !== originalLength) {
        repairs.push(`paramArray length mismatch: ${originalLength} → ${working.paramArray.length}`);
      }
    }

    const reasoningRaw = working.reasoning ?? "";
    const trimmed = reasoningRaw.trim();
    if (trimmed.length < opts.enforceReasoningMinChars) {
      if (opts.mode === "CLAMP") {
        const padded = trimmed.padEnd(opts.enforceReasoningMinChars, ".");
        repairs.push(`reasoning: length ${trimmed.length} → ${padded.length} (padded)`);
        working.reasoning = padded;
      } else {
        repairs.push(
          `reasoning: would pad length ${trimmed.length} → ${opts.enforceReasoningMinChars} (LOG_ONLY)`,
        );
      }
    }
    if (!reasoningRaw.trim() && opts.mode === "CLAMP") {
      repairs.push("reasoning: missing → placeholder");
      working.reasoning = "Surgical repair: reasoning was empty (operator review).";
    } else if (!reasoningRaw.trim() && opts.mode === "LOG_ONLY") {
      repairs.push("reasoning: would add placeholder (LOG_ONLY)");
    }

    if (typeof working.score === "number") {
      const clampedScore = Math.max(0, Math.min(1, working.score));
      if (Math.abs(clampedScore - working.score) > 1e-9) {
        if (opts.mode === "CLAMP") {
          repairs.push(`score: ${working.score.toFixed(4)} → ${clampedScore.toFixed(4)}`);
          working.score = clampedScore;
        } else {
          repairs.push(`score: would clamp ${working.score.toFixed(4)} → ${clampedScore.toFixed(4)} (LOG_ONLY)`);
        }
      }
    }

    const fp = candidateFingerprint(candidate);
    if (repairs.length > 0) {
      queueHeavyRepairSchism(repairs.length);
      if (opts.mode === "LOG_ONLY") {
        logEvent("surgical_repair_log_only", {
          candidateFingerprint: fp,
          repairsCount: repairs.length,
          repairs,
          provenance: opts.provenance,
        });
      } else {
        logEvent("surgical_repair_applied", {
          candidateFingerprint: fp,
          repairsCount: repairs.length,
          repairs,
          provenance: opts.provenance,
        });
      }
    } else {
      logEvent("surgical_repair_noop", {
        candidateFingerprint: fp,
        provenance: opts.provenance,
      });
    }

    return {
      repairedCandidate: working,
      repairsApplied: repairs,
      success: true,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    logEvent("surgical_repair_error", {
      error: message,
      provenance: opts.provenance,
    });
    return {
      repairedCandidate: null,
      repairsApplied: [],
      success: false,
      note: message,
    };
  }
}

/**
 * Repair then delegate to encode/push — **encode/push is not wired here**;
 * returns **`VST_ENCODE_PUSH_NOT_WIRED`** until `vst-bridge` / CLI owns the pipeline.
 */
export async function repairAndPushToVst(
  candidate: AICandidate,
  _vstConfig: unknown,
  provenance = "vst_observer",
): Promise<VstSyncResult> {
  const repair = performSurgicalRepair(candidate, { ...DEFAULT_OPTIONS, provenance });

  if (!repair.success || !repair.repairedCandidate) {
    return {
      success: false,
      fxpPath: "",
      validated: false,
      pushedAt: new Date().toISOString(),
      schism: "SURGICAL_REPAIR_FAILED",
      provenance,
    };
  }

  logEvent("surgical_repair_to_vst", {
    repaired: true,
    repairsCount: repair.repairsApplied.length,
    provenance,
    note: "Encode/push not wired in shared-engine — use CLI / future vst-bridge after HARD GATE.",
  });

  return {
    success: false,
    fxpPath: "",
    validated: false,
    pushedAt: new Date().toISOString(),
    schism: "VST_ENCODE_PUSH_NOT_WIRED",
    provenance,
  };
}
