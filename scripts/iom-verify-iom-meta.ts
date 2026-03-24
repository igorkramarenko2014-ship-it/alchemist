/**
 * Emits one JSON object (stdout) for **`run-verify-with-summary.mjs`** — offline IOM meta only.
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildIomOfflineSnapshot } from "./lib/iom-offline-snapshot";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const snap = buildIomOfflineSnapshot(root);
const ev = snap.engineValuationHeuristic;
process.stdout.write(
  `${JSON.stringify({
    iomActiveSchisms: snap.iomActiveSchisms,
    iomHealthVerdict: snap.iomHealthVerdict,
    recommendedNext: snap.recommendedNext,
    iomPendingProposalCount: snap.iomPendingProposalCount,
    iomSoeHintHead: snap.iomSoeHintHead,
    iomHealthTier: snap.iomHealthTier,
    iomSchismCodes: snap.iomSchismCodes,
    iomEngineHeuristic: {
      heuristicVersion: ev.heuristicVersion,
      philosophyNote: ev.philosophyNote,
      totalLines: ev.metrics.totalLines,
      totalFiles: ev.metrics.totalFiles,
      testFileCount: ev.metrics.testFileCount,
      engMonthsMid: Number(ev.engMonthsMid.toFixed(2)),
      replacementCostUsdMid: ev.replacementCostUsdMid,
      replacementCostUsdBand: ev.replacementCostUsdBand,
      nonExclusiveLicenseYear1UsdBand: ev.nonExclusiveLicenseYear1UsdBand,
      operatorLine: ev.operatorLine,
    },
  })}\n`,
);
