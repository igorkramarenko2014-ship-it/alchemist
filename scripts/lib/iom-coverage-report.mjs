/**
 * IOM test↔cell coverage for **`verify_post_summary`**.
 * Keep mapping aligned with **`packages/shared-engine/iom-coverage.ts`** (`IOM_CELL_VITEST_MAP`).
 */
/** @type {Record<string, string[]>} */
export const IOM_CELL_VITEST_FILES = {
  triad: ["tests/triad-pulse-alignment.test.ts"],
  gatekeeper: ["tests/gatekeeper-telemetry.test.ts"],
  undercover_adversarial: ["tests/undercover-slavic.test.ts"],
  slavic_score: ["tests/undercover-slavic.test.ts"],
  soe: ["tests/soe.test.ts"],
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
};

/**
 * @param {unknown[]} cells from igor-power-cells.json
 * @param {string[]} executedVitestRelPaths e.g. `tests/foo.test.ts` under shared-engine
 * @returns {{ iomCoverageScore: number, uncoveredCells: string[], iomCoveredCellCount: number, iomPowerCellTotal: number, iomUnmappedCellIds: string[] }}
 */
export function computeIomCoverageReport(cells, executedVitestRelPaths) {
  if (!Array.isArray(cells)) {
    return {
      iomCoverageScore: 0,
      uncoveredCells: [],
      iomCoveredCellCount: 0,
      iomPowerCellTotal: 0,
      iomUnmappedCellIds: [],
    };
  }
  const executed = new Set(executedVitestRelPaths.map((p) => p.split("\\").join("/")));
  const ids = cells.map((c) => (c && typeof c === "object" && typeof c.id === "string" ? c.id : null)).filter(Boolean);
  const unmapped = [];
  const uncovered = [];
  let covered = 0;
  for (const id of ids) {
    const mapped = IOM_CELL_VITEST_FILES[id];
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
    uncoveredCells: [...new Set(uncovered)].sort(),
    iomCoveredCellCount: covered,
    iomPowerCellTotal: total,
    iomUnmappedCellIds: [...new Set(unmapped)].sort(),
  };
}
