import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { getIgorOrchestratorManifest } from "../igor-orchestrator-layer";
import { getIOMCoverageReport, IOM_CELL_VITEST_MAP } from "../iom-coverage";

const engineDir = join(fileURLToPath(new URL(".", import.meta.url)), "..");

function collectAllEngineTestRelPaths(): string[] {
  const testsDir = join(engineDir, "tests");
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
  return [...new Set(out)].sort();
}

describe("getIOMCoverageReport", () => {
  it("scores 1 when all mapped Vitest files are executed", () => {
    const cells = getIgorOrchestratorManifest().sharedEnginePowerCells;
    const executed = collectAllEngineTestRelPaths();
    const r = getIOMCoverageReport(cells, executed);
    expect(r.iomPowerCellTotal).toBe(cells.length);
    expect(r.iomCoverageScore).toBe(1);
    expect(r.uncoveredCells).toEqual([]);
    expect(r.iomUnmappedCellIds).toEqual([]);
  });

  it("flags uncovered cells when executed set is empty", () => {
    const cells = getIgorOrchestratorManifest().sharedEnginePowerCells;
    const r = getIOMCoverageReport(cells, []);
    expect(r.iomCoverageScore).toBe(0);
    expect(r.uncoveredCells.length).toBeGreaterThan(0);
  });

  it("IOM_CELL_VITEST_MAP has an entry for every power cell id", () => {
    const cells = getIgorOrchestratorManifest().sharedEnginePowerCells;
    for (const c of cells) {
      expect(IOM_CELL_VITEST_MAP[c.id], `missing vitest map for cell ${c.id}`).toBeDefined();
      expect((IOM_CELL_VITEST_MAP[c.id] ?? []).length).toBeGreaterThan(0);
    }
  });
});
