/**
 * Optional **`SoeTriadSnapshot`** for **`GET /api/health` → `iomPulse`** when operators inject
 * rolling aggregates from their log pipeline (stderr **`verify_post_summary`**, metrics sidecar, etc.).
 *
 * Set **all three** required vars to enable; optional vars extend the snapshot. Omit any required
 * var → no snapshot (pulse still runs on triad/WASM flags only).
 */
import type { SoeTriadSnapshot } from "@alchemist/shared-engine";

function parseFiniteNumber(raw: string | undefined): number | null {
  if (raw === undefined || raw.trim() === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function parseRate(raw: string | undefined): number | null {
  const n = parseFiniteNumber(raw);
  if (n === null) return null;
  if (n < 0 || n > 1) return null;
  return n;
}

/**
 * @returns **`undefined`** unless **`ALCHEMIST_SOE_MEAN_PANELIST_MS`**, **`ALCHEMIST_SOE_TRIAD_FAILURE_RATE`**,
 * and **`ALCHEMIST_SOE_GATE_DROP_RATE`** are all set to valid numbers.
 */
export function getOptionalSoeTriadSnapshotFromEnv(): SoeTriadSnapshot | undefined {
  const meanPanelistMs = parseFiniteNumber(process.env.ALCHEMIST_SOE_MEAN_PANELIST_MS);
  const triadFailureRate = parseRate(process.env.ALCHEMIST_SOE_TRIAD_FAILURE_RATE);
  const gateDropRate = parseRate(process.env.ALCHEMIST_SOE_GATE_DROP_RATE);
  if (meanPanelistMs === null || meanPanelistMs < 0) return undefined;
  if (triadFailureRate === null || gateDropRate === null) return undefined;

  const meanRunMs = parseFiniteNumber(process.env.ALCHEMIST_SOE_MEAN_RUN_MS);
  const stub = parseRate(process.env.ALCHEMIST_SOE_STUB_RUN_FRACTION);

  const snap: SoeTriadSnapshot = {
    meanPanelistMs,
    triadFailureRate,
    gateDropRate,
  };
  if (meanRunMs !== null && meanRunMs >= 0) {
    snap.meanRunMs = meanRunMs;
  }
  if (stub !== null) {
    snap.triadStubRunFraction = stub;
  }
  return snap;
}
