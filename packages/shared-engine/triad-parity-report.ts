/**
 * Structured diff for **`runTriad`** across stub / mixed / fully-live fetches — tests and ops harness.
 * Does not call providers; consumes **`AIAnalysis`** only.
 */
import type { AIAnalysis } from "@alchemist/shared-types";

export type TriadParitySnapshot = {
  label: string;
  triadParityMode: string;
  triadRunMode: string;
  triadDegraded: boolean;
  rawCandidateCount: number;
  afterGateCount: number;
  gateDropRate: number;
  meanPanelistMs: number;
  triadFailureRate: number;
  /** Sorted by score desc — comparable ranking shape. */
  rankingFingerprint: string;
  /** LLAMA|DEEPSEEK|QWEN panel survival fingerprint. */
  panelOutcomeFingerprint: string;
};

export type TriadParityDiffEntry = { field: string; baseline: unknown; compare: unknown };

function fingerprintRanking(candidates: AIAnalysis["candidates"]): string {
  return [...candidates]
    .sort((a, b) => b.score - a.score)
    .map((c) => `${c.panelist}:${c.score.toFixed(4)}`)
    .join("|");
}

function fingerprintOutcomes(t: AIAnalysis["triadRunTelemetry"]): string {
  if (!t?.triadPanelOutcomes?.length) return "";
  return t.triadPanelOutcomes
    .map((o) => `${o.panelist}:${o.candidateCount}:${o.failed ? "F" : "ok"}`)
    .join("|");
}

export function snapshotTriadAnalysis(label: string, analysis: AIAnalysis): TriadParitySnapshot {
  const tel = analysis.triadRunTelemetry;
  return {
    label,
    triadParityMode: tel?.triadParityMode ?? "unknown",
    triadRunMode: tel?.triadRunMode ?? "unknown",
    triadDegraded: tel?.triadDegraded ?? true,
    rawCandidateCount: tel?.rawCandidateCount ?? 0,
    afterGateCount: tel?.afterGateCount ?? 0,
    gateDropRate: tel?.gateDropRate ?? 0,
    meanPanelistMs: tel?.meanPanelistMs ?? 0,
    triadFailureRate: tel?.triadFailureRate ?? 0,
    rankingFingerprint: fingerprintRanking(analysis.candidates),
    panelOutcomeFingerprint: fingerprintOutcomes(tel),
  };
}

const SNAPSHOT_KEYS = [
  "triadParityMode",
  "triadRunMode",
  "triadDegraded",
  "rawCandidateCount",
  "afterGateCount",
  "gateDropRate",
  "meanPanelistMs",
  "triadFailureRate",
  "rankingFingerprint",
  "panelOutcomeFingerprint",
] as const;

export function diffTriadParitySnapshots(
  baseline: TriadParitySnapshot,
  compare: TriadParitySnapshot
): TriadParityDiffEntry[] {
  const out: TriadParityDiffEntry[] = [];
  for (const k of SNAPSHOT_KEYS) {
    if (baseline[k] !== compare[k]) {
      out.push({ field: k, baseline: baseline[k], compare: compare[k] });
    }
  }
  return out;
}

/** JSON-serializable row for **`logEvent`** or CI artifacts. */
export function buildTriadParityHarnessRecord(
  prompt: string,
  snapshots: TriadParitySnapshot[],
  pairwiseDiffs: TriadParityDiffEntry[][]
): Record<string, unknown> {
  return {
    event: "triad_parity_harness",
    promptLen: prompt.length,
    snapshots,
    pairwiseDiffs,
  };
}
