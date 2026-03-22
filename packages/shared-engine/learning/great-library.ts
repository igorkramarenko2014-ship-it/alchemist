/**
 * **Alchemist Great Library (AGL)** — **TypeScript metadata boundary** only.
 *
 * **FIRE:** No scrapers, no vector DB client, no C++ DSP, no real-time learning inside
 * **`AI_TIMEOUT_MS`**. Offline jobs (cron, worker, ETL) produce **explicit** context;
 * this module merges it into **`SoeTriadSnapshot`** with a **provenance** audit trail.
 *
 * **Forbidden:** omnipotent weight rewrites, hidden “intuition” without source,
 * Slavic bypass, amnesia / silent history wipe — every bridge is **`logEvent`**-able.
 */
import { logEvent } from "../telemetry";
import type { SoeTriadSnapshot } from "../soe";

/** Context produced **outside** `shared-engine` (ETL, research notebook, batch job). */
export interface GreatLibraryContext {
  /**
   * **Required** — human-readable audit trail (dataset name, license, URI, org policy).
   * Never omit: SOE consumers must know where adjusted numbers came from.
   */
  provenance: string;
  /** ISO-8601 when the offline job finished. */
  collectedAt: string;
  /** Correlates with your batch / Airflow / CI job id. */
  jobRunId?: string;
  /** Free-form notes for operators (e.g. “subset of CC-licensed forum posts only”). */
  notes?: string;
  /**
   * Optional partial overlay on **`SoeTriadSnapshot`** — only keys you set are merged.
   * Caller is responsible for legality of data used to derive these numbers.
   */
  snapshotAugment?: Partial<SoeTriadSnapshot>;
}

export interface GreatLibraryMergeResult {
  snapshot: SoeTriadSnapshot;
  /** Which **`SoeTriadSnapshot` keys** were taken from **`snapshotAugment`**. */
  appliedAugmentKeys: (keyof SoeTriadSnapshot)[];
  provenance: string;
  collectedAt: string;
  jobRunId?: string;
}

const SNAPSHOT_KEYS: (keyof SoeTriadSnapshot)[] = [
  "meanPanelistMs",
  "triadFailureRate",
  "gateDropRate",
  "meanRunMs",
];

function pickDefinedAugment(
  aug: Partial<SoeTriadSnapshot> | undefined
): Partial<SoeTriadSnapshot> {
  if (!aug) return {};
  const out: Partial<SoeTriadSnapshot> = {};
  for (const k of SNAPSHOT_KEYS) {
    const v = aug[k];
    if (v !== undefined && typeof v === "number" && Number.isFinite(v)) {
      (out as Record<string, number>)[k] = v;
    }
  }
  return out;
}

/**
 * Merge **operator-supplied** offline metrics into a base SOE snapshot.
 * Does **not** fetch networks, read `.fxp` bytes, or touch **`PANELIST_WEIGHTS`**.
 */
export function mergeGreatLibraryIntoSoeSnapshot(
  base: SoeTriadSnapshot,
  ctx: GreatLibraryContext
): GreatLibraryMergeResult {
  const prov = ctx.provenance.trim();
  if (!prov) {
    throw new Error("GreatLibraryContext.provenance is required (audit trail)");
  }
  const overlay = pickDefinedAugment(ctx.snapshotAugment);
  const appliedAugmentKeys = Object.keys(overlay) as (keyof SoeTriadSnapshot)[];
  const snapshot: SoeTriadSnapshot = { ...base, ...overlay };
  return {
    snapshot,
    appliedAugmentKeys,
    provenance: prov,
    collectedAt: ctx.collectedAt,
    jobRunId: ctx.jobRunId,
  };
}

/** Structured line for pipelines — same pattern as triad / talent / verify summary. */
export function logGreatLibraryMerge(
  result: GreatLibraryMergeResult,
  runId?: string
): void {
  logEvent("great_library_soe_merge", {
    runId,
    provenance: result.provenance,
    collectedAt: result.collectedAt,
    jobRunId: result.jobRunId,
    appliedAugmentKeys: result.appliedAugmentKeys,
    note:
      "Offline AGL context merged into SoeTriadSnapshot — no hidden intuition; inspect provenance.",
  });
}
