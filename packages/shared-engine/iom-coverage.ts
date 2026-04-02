/**
 * IOM ↔ Vitest coverage map for **`getIOMCoverageReport`** (ops / verify summaries).
 * **Keep in sync** with **`scripts/lib/iom-coverage-report.mjs`** (`IOM_CELL_VITEST_FILES`).
 */
import type { IgorOrchestratorPowerCell } from "./igor-orchestrator-layer";

export const IOM_CELL_VITEST_MAP: Readonly<Record<string, readonly string[]>> = {
  triad: ["tests/triad-pulse-alignment.test.ts"],
  gatekeeper: ["tests/gatekeeper-telemetry.test.ts"],
  undercover_adversarial: ["tests/undercover-slavic.test.ts"],
  slavic_score: ["tests/undercover-slavic.test.ts"],
  soe: ["tests/soe.test.ts", "tests/reality-signals-log.test.ts"],
  agent_fusion: ["tests/agent-fusion.test.ts"],
  integrity: ["tests/integrity.test.ts"],
  aji_entropy: ["tests/aji-entropy.test.ts"],
  schism: ["tests/schism.test.ts"],
  triad_governance: ["tests/triad-panel-governance.test.ts"],
  arbitration: ["tests/transparent-arbitration.test.ts"],
  taxonomy: ["tests/taxonomy-engine.test.ts", "tests/taxonomy-sparse-rank.test.ts"],
  talent_market: ["tests/talent-market-scout.test.ts"],
  tablebase: [
    "tests/reliability-tablebase.test.ts",
    "tests/tablebase-shortcircuit.test.ts",
    "tests/learning-great-library.test.ts",
  ],
  perf_boss: ["tests/compliant-perf-boss.test.ts"],
  prompt_guard: ["tests/engine-harsh.test.ts"],
  pnh: [
    "tests/pnh-ghost-run.test.ts",
    "tests/pnh-warfare-model.test.ts",
    "tests/pnh-apt-scenarios.test.ts",
    "tests/telemetry-redact.test.ts",
    "tests/triad-rate-limit-core.test.ts",
  ],
  vst_observer: ["tests/vst-observer.test.ts", "tests/surgical-repair.test.ts"],
  vst_wrapper: ["tests/vst-wrapper-pulse.test.ts"],
  preset_share: ["tests/preset-share-cell.test.ts"],
  cyclic_integrity: ["tests/core-model.test.ts"],
  humanitarian_integrity: ["tests/humanitarian.test.ts"],
} as const;

export interface IOMCoverageReport {
  /** Fraction of power cells whose mapped Vitest files all appear in `executedVitestRelPaths`. */
  iomCoverageScore: number;
  /** Cell ids missing full mapped-test coverage for this run. */
  uncoveredCells: string[];
  iomCoveredCellCount: number;
  iomPowerCellTotal: number;
  /** Cells with no Vitest map entry (operator backlog). */
  iomUnmappedCellIds: string[];
}

/**
 * Cross-reference **`igor-power-cells.json`** rows against executed Vitest paths
 * (posix, relative to `packages/shared-engine/`, e.g. `tests/soe.test.ts`).
 */
export function getIOMCoverageReport(
  cells: readonly Pick<IgorOrchestratorPowerCell, "id">[],
  executedVitestRelPaths: readonly string[],
): IOMCoverageReport {
  const executed = new Set(executedVitestRelPaths.map((p) => p.split("\\").join("/")));
  const ids = cells.map((c) => c.id).filter(Boolean);
  const unmapped: string[] = [];
  const uncovered: string[] = [];
  let covered = 0;
  for (const id of ids) {
    const mapped = IOM_CELL_VITEST_MAP[id];
    if (!mapped || mapped.length === 0) {
      unmapped.push(id);
      uncovered.push(id);
      continue;
    }
    const allRan = mapped.every((f) => executed.has(f.split("\\").join("/")));
    if (allRan) covered += 1;
    else uncovered.push(id);
  }
  const total = ids.length;
  const score = total > 0 ? Math.round((covered / total) * 1000) / 1000 : 0;
  return {
    iomCoverageScore: score,
    uncoveredCells: Array.from(new Set(uncovered)).sort(),
    iomCoveredCellCount: covered,
    iomPowerCellTotal: total,
    iomUnmappedCellIds: Array.from(new Set(unmapped)).sort(),
  };
}
