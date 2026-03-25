/**
 * Shared offline IOM snapshot for **`pnpm iom:status`**, **`verify_post_summary`**, and ops tooling.
 * Diagnostic only.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  EXECUTION_TIER_VERSION,
  computeEngineValuationHeuristic,
  computeSoeRecommendations,
  getIgorOrchestratorManifest,
  getExecutionTier,
  getIOMCoverageReport,
  getIOMHealthPulse,
  isAdvisoryOnlyCell,
  type EngineValuationHeuristicResult,
} from "@alchemist/shared-engine";
import { collectEnginePackageMetrics } from "./engine-package-scan";

export function collectAllEngineTestRelPaths(engineRoot: string): string[] {
  const testsDir = join(engineRoot, "tests");
  const out: string[] = [];
  function walk(dir: string, prefix: string) {
    if (!existsSync(dir)) return;
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      const rel = prefix ? `${prefix}/${ent.name}` : ent.name;
      const abs = join(dir, ent.name);
      if (ent.isDirectory()) walk(abs, rel);
      else if (ent.isFile() && ent.name.endsWith(".test.ts")) {
        out.push(`tests/${rel.split("\\").join("/")}`);
      }
    }
  }
  walk(testsDir, "");
  return Array.from(new Set(out)).sort();
}

export function countHealProposalLines(toolsDir: string): number {
  const p = join(toolsDir, "iom-proposals.jsonl");
  if (!existsSync(p)) return 0;
  const lines = readFileSync(p, "utf8").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  let n = 0;
  for (const line of lines) {
    try {
      const o = JSON.parse(line) as { kind?: string };
      if (o?.kind === "iom_ghost_cell") n += 1;
    } catch {
      /* skip */
    }
  }
  return n;
}

export function countPnhEnforcementProposalLines(toolsDir: string): number {
  const p = join(toolsDir, "pnh-proposals.jsonl");
  if (!existsSync(p)) return 0;
  const lines = readFileSync(p, "utf8").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  let n = 0;
  for (const line of lines) {
    try {
      const o = JSON.parse(line) as { kind?: string };
      if (o?.kind === "pnh_enforcement") n += 1;
    } catch {
      /* skip */
    }
  }
  return n;
}

export interface IomOfflineSnapshot {
  generatedAtMs: number;
  pulseVersion: number;
  igorLayerVersion: number;
  powerCellCount: number;
  executionTierVersion: number;
  tier1CellCount: number;
  tier2CellCount: number;
  tier3CellCount: number;
  iomCoverageScore: number;
  /** Total schism findings in offline pulse (`getIOMHealthPulse({})`). */
  iomActiveSchisms: number;
  iomSchismCodes: string[];
  iomSchismCritical: number;
  iomSchismWarn: number;
  iomSchismInfo: number;
  /** Short tier for dashboards: `strong` | `watch` | `critical`. */
  iomHealthTier: "strong" | "watch" | "critical";
  /** One-line human verdict (paste-friendly). */
  iomHealthVerdict: string;
  /** Suggested follow-up command(s). */
  recommendedNext: string;
  iomPendingProposalCount: number;
  pnhPendingProposalCount: number;
  iomSoeHintHead: string;
  /**
   * Replacement-cost heuristic — same as **`pnpm estimate`**. Descriptive only; not valuation
   * advice and not a gate input.
   */
  engineValuationHeuristic: EngineValuationHeuristicResult;
}

export function buildIomOfflineSnapshot(monorepoRoot: string): IomOfflineSnapshot {
  const toolsDir = join(monorepoRoot, "tools");
  const engineRoot = join(monorepoRoot, "packages", "shared-engine");
  const generatedAtMs = Date.now();

  const manifest = getIgorOrchestratorManifest();
  const tierCounts = { tier1: 0, tier2: 0, tier3: 0 };
  for (const c of manifest.sharedEnginePowerCells) {
    const tier = getExecutionTier(c.id);
    if (tier === "tier1_hot_path") tierCounts.tier1 += 1;
    else if (tier === "tier2_release_truth") tierCounts.tier2 += 1;
    else tierCounts.tier3 += 1;
  }
  const executed = collectAllEngineTestRelPaths(engineRoot);
  const iomCoverage = getIOMCoverageReport(manifest.sharedEnginePowerCells, executed);
  const pulse = getIOMHealthPulse({});
  const schismCodes = pulse.schisms.map((s) => s.code);
  const soe = computeSoeRecommendations(
    { meanPanelistMs: 0, triadFailureRate: 0, gateDropRate: 0 },
    { iomSchismCodes: schismCodes, iomCoverageScore: iomCoverage.iomCoverageScore },
  );
  const proposals = countHealProposalLines(toolsDir);
  const pnhProposals = countPnhEnforcementProposalLines(toolsDir);
  const engineMetrics = collectEnginePackageMetrics(monorepoRoot);
  const engineValuationHeuristic = computeEngineValuationHeuristic(engineMetrics);

  const crit = pulse.schisms.filter((s) => s.severity === "critical").length;
  const warn = pulse.schisms.filter((s) => s.severity === "warn").length;
  const info = pulse.schisms.filter((s) => s.severity === "info").length;

  let iomHealthTier: IomOfflineSnapshot["iomHealthTier"];
  let detail: string;
  if (crit > 0) {
    iomHealthTier = "critical";
    detail = "critical schisms — triage triad/WASM/SOE before ship";
  } else if (warn > 0 || iomCoverage.iomCoverageScore < 0.85 || proposals > 0 || pnhProposals > 0) {
    iomHealthTier = "watch";
    detail = "warn schisms, low coverage, and/or pending heal/PNH proposals";
  } else {
    iomHealthTier = "strong";
    detail = "no warn/crit schisms; coverage ok; proposal queue empty";
  }

  const advisoryCount = manifest.sharedEnginePowerCells.filter((c) => isAdvisoryOnlyCell(c.id)).length;
  const iomHealthVerdict = `${iomHealthTier} — ${pulse.schisms.length} schism(s) (crit ${crit}, warn ${warn}, info ${info}); coverage ${iomCoverage.iomCoverageScore.toFixed(2)}; proposals iom=${proposals}, pnh=${pnhProposals}; tiers t1=${tierCounts.tier1} t2=${tierCounts.tier2} t3=${tierCounts.tier3} (advisory=${advisoryCount})`;

  let recommendedNext: string;
  if (crit > 0 || warn > 0) {
    recommendedNext = "pnpm iom:status && pnpm verify:harsh — review schisms and recent triad telemetry";
  } else if (proposals > 0 || pnhProposals > 0) {
    recommendedNext =
      "pnpm iom:status && pnpm igor:apply (IOM) / pnpm pnh:proposals (PNH) — review pending proposal queues";
  } else if (iomCoverage.iomCoverageScore < 0.85) {
    recommendedNext = "pnpm iom:status && pnpm igor:heal — improve Vitest↔cell mapping or add tests";
  } else {
    recommendedNext = "pnpm iom:status — routine IOM snapshot (optional before release)";
  }

  return {
    generatedAtMs,
    pulseVersion: pulse.pulseVersion,
    igorLayerVersion: manifest.layerVersion,
    powerCellCount: manifest.sharedEnginePowerCells.length,
    executionTierVersion: EXECUTION_TIER_VERSION,
    tier1CellCount: tierCounts.tier1,
    tier2CellCount: tierCounts.tier2,
    tier3CellCount: tierCounts.tier3,
    iomCoverageScore: iomCoverage.iomCoverageScore,
    iomActiveSchisms: pulse.schisms.length,
    iomSchismCodes: schismCodes,
    iomSchismCritical: crit,
    iomSchismWarn: warn,
    iomSchismInfo: info,
    iomHealthTier,
    iomHealthVerdict,
    recommendedNext,
    iomPendingProposalCount: proposals,
    pnhPendingProposalCount: pnhProposals,
    iomSoeHintHead: soe.message.split("\n")[0] ?? "",
    engineValuationHeuristic,
  };
}
