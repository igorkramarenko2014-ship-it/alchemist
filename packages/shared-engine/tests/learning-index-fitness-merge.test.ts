import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

function findMonorepoRoot(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 18; i += 1) {
    const pj = join(dir, "package.json");
    if (existsSync(pj)) {
      try {
        const j = JSON.parse(readFileSync(pj, "utf8")) as { name?: string; workspaces?: unknown };
        if (j.name === "alchemist" && Array.isArray(j.workspaces)) return dir;
      } catch {
        /* continue */
      }
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error("monorepo root not found from test file");
}

describe("build-learning-index fitness merge", () => {
  it("merges only fitness fields; no mappings / telemetry blobs", () => {
    const root = findMonorepoRoot();
    const script = join(root, "packages/shared-engine/learning/scripts/build-learning-index.mjs");
    const tmpReport = join(mkdtempSync(join(tmpdir(), "alchemist-lfit-")), "report.json");
    const fr = {
      aggregationVersion: 3,
      lessons: [
        {
          lessonId: "engine_school_role_model_v1",
          fitnessScore: 0.55,
          fitnessConfidence: "medium",
          sampleCount: 12,
          stalenessDays: 3,
          leakProbe: "should-not-appear",
        },
      ],
      learningOutcomes: {
        candidateSuccessRate: 0.1,
        meanBestScoreWithLessons: 0.2,
        orderChangeRate: 0,
        tasteClusterHitRate: 0,
        authoritative: false,
        note: "test",
      },
    };
    writeFileSync(tmpReport, `${JSON.stringify(fr)}\n`, "utf8");
    try {
      execFileSync(process.execPath, [script], {
        cwd: root,
        encoding: "utf8",
        env: { ...process.env, ALCHEMIST_LEARNING_FITNESS_REPORT_PATH: tmpReport },
      });
      const idxPath = join(root, "packages/shared-engine/learning/learning-index.json");
      const idx = JSON.parse(readFileSync(idxPath, "utf8")) as {
        lessons: Array<Record<string, unknown>>;
        fitnessSnapshot?: { learningOutcomes?: unknown };
      };
      const row = idx.lessons.find((l) => l.id === "engine_school_role_model_v1");
      expect(row?.fitnessScore).toBe(0.55);
      expect(row?.fitnessConfidence).toBe("medium");
      expect(row?.sampleCount).toBe(12);
      expect(row?.stalenessDays).toBe(3);
      expect(row).not.toHaveProperty("leakProbe");
      expect(JSON.stringify(idx)).not.toContain("leakProbe");
      expect(JSON.stringify(idx)).not.toContain("passedPanelistValidation");
      expect(idx.fitnessSnapshot?.learningOutcomes).toBeDefined();
    } finally {
      try {
        rmSync(dirname(tmpReport), { recursive: true, force: true });
      } catch {
        /* ignore */
      }
    }
  });
});
