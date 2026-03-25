/**
 * Unified offline IOM health snapshot for operators / external review (Markdown on stdout).
 *
 * Usage (repo root): `pnpm iom:status`  (via **`node scripts/iom-status.mjs`** wrapper)
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildIomOfflineSnapshot } from "./lib/iom-offline-snapshot";

function mdCell(s: string): string {
  return s.replace(/\|/g, "\\|").replace(/\r?\n/g, " ").trim();
}

function main(): void {
  const here = dirname(fileURLToPath(import.meta.url));
  const root = join(here, "..");
  const snap = buildIomOfflineSnapshot(root);

  const schismSummary =
    snap.iomActiveSchisms === 0
      ? "(none)"
      : snap.iomSchismCodes.join(", ") || "(none)";

  const verdictLong =
    snap.iomHealthTier === "critical"
      ? "RED — critical schisms in pulse; triage triad/WASM/SOE signals before ship."
      : snap.iomHealthTier === "watch"
        ? "YELLOW — review warn-level schisms, IOM coverage (<0.85), and/or pending `pnpm igor:apply` queue."
        : "GREEN — no critical/warn schisms; coverage ≥0.85 and no heal proposals (info-only schisms may still apply).";

  const lines = [
    "## IOM status (offline)",
    "",
    "| Field | Value |",
    "|-------|-------|",
    `| **Generated (UTC)** | ${mdCell(new Date(snap.generatedAtMs).toISOString())} |`,
    `| **IOM pulse version** | ${snap.pulseVersion} |`,
    `| **Igor layerVersion** | ${snap.igorLayerVersion} |`,
    `| **Execution tier schema** | v${snap.executionTierVersion} |`,
    `| **Power cells** | ${snap.powerCellCount} |`,
    `| **Tier split** | T1 ${snap.tier1CellCount} / T2 ${snap.tier2CellCount} / T3 ${snap.tier3CellCount} |`,
    `| **iomCoverageScore** | ${snap.iomCoverageScore.toFixed(3)} |`,
    `| **Schism count** | ${snap.iomActiveSchisms} (critical ${snap.iomSchismCritical}, warn ${snap.iomSchismWarn}, info ${snap.iomSchismInfo}) |`,
    `| **Schisms** | ${mdCell(schismSummary)} |`,
    `| **SOE hint (head)** | ${mdCell(snap.iomSoeHintHead)} |`,
    `| **Heal proposals (\`iom_ghost_cell\` lines)** | ${snap.iomPendingProposalCount} |`,
    `| **PNH enforcement proposals (\`pnh_enforcement\` lines)** | ${snap.pnhPendingProposalCount} |`,
    "",
    "### Engine scale heuristic (market context — not valuation)",
    "",
    "_Same math as `pnpm estimate`. Descriptive only; does not affect schisms, gates, or triad._",
    "",
    "| Field | Value |",
    "|-------|-------|",
    `| **LOC (shared-engine + fxp-encoder)** | ${snap.engineValuationHeuristic.metrics.totalLines} |`,
    `| **Source files** | ${snap.engineValuationHeuristic.metrics.totalFiles} |`,
    `| **Vitest files** | ${snap.engineValuationHeuristic.metrics.testFileCount} |`,
    `| **Eng-months (mid @ 80 LOC/d)** | ${snap.engineValuationHeuristic.engMonthsMid.toFixed(2)} |`,
    `| **Replacement cost (mid USD)** | ${snap.engineValuationHeuristic.replacementCostUsdMid.toLocaleString()} |`,
    `| **Replacement band (USD)** | ${snap.engineValuationHeuristic.replacementCostUsdBand[0].toLocaleString()} – ${snap.engineValuationHeuristic.replacementCostUsdBand[1].toLocaleString()} |`,
    `| **Non-exclusive Y1 anchor (USD)** | ${snap.engineValuationHeuristic.nonExclusiveLicenseYear1UsdBand[0].toLocaleString()} – ${snap.engineValuationHeuristic.nonExclusiveLicenseYear1UsdBand[1].toLocaleString()} |`,
    "",
    `**Operator line:** ${mdCell(snap.engineValuationHeuristic.operatorLine)}`,
    "",
    `**Verdict:** ${verdictLong}`,
    "",
    `**Recommended next:** ${mdCell(snap.recommendedNext)}`,
    "",
    "_Diagnostic only — no gate mutation. For JSON: `pnpm igor:checkup`. For snapshots: `pnpm iom:snapshot`._",
    "",
  ];

  process.stdout.write(lines.join("\n"));
}

main();
