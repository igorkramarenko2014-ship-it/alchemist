import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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

describe("aggregate-learning-telemetry (Fitness v1)", () => {
  it("low sample count → low confidence; deterministic JSON", () => {
    const root = findMonorepoRoot();
    const script = join(
      root,
      "packages/shared-engine/learning/scripts/aggregate-learning-telemetry.mjs",
    );
    const tmpTelemetry = mkdtempSync(join(tmpdir(), "alchemist-ltel-"));
    const outReport = join(tmpdir(), `alchemist-fr-${Date.now()}.json`);
    const line = {
      eventType: "engine_school_influence",
      lessonIds: ["lesson-low-n"],
      triadSessionId: "sess-a",
      candidatesGenerated: 4,
      passedPanelistValidation: 2,
      bestScore: 0.72,
      timestampUtc: "2026-03-29T12:00:00.000Z",
      mode: "fetcher",
    };
    writeFileSync(join(tmpTelemetry, "day.jsonl"), `${JSON.stringify(line)}\n`, "utf8");
    try {
      execFileSync(process.execPath, [script], {
        cwd: root,
        encoding: "utf8",
        env: {
          ...process.env,
          ALCHEMIST_LEARNING_TELEMETRY_DIR: tmpTelemetry,
          ALCHEMIST_LEARNING_FITNESS_REPORT_OUT: outReport,
          ALCHEMIST_LEARNING_SKIP_INDEX_MERGE: "1",
        },
      });
      const report = JSON.parse(readFileSync(outReport, "utf8")) as {
        aggregationVersion: number;
        lessons: Array<{ lessonId: string; fitnessConfidence: string; sampleCount: number }>;
        learningOutcomes: {
          authoritative: boolean;
          orderChangeRate: number;
          sampleCount: number;
          confidence: string;
        };
      };
      expect(report.aggregationVersion).toBe(3);
      const row = report.lessons.find((l) => l.lessonId === "lesson-low-n");
      expect(row?.fitnessConfidence).toBe("low");
      expect(row?.sampleCount).toBe(1);
      expect(report.learningOutcomes.authoritative).toBe(false);
      expect(report.learningOutcomes.orderChangeRate).toBe(0);
      expect(report.learningOutcomes.sampleCount).toBe(1);
      expect(report.learningOutcomes.confidence).toBe("low");
    } finally {
      rmSync(tmpTelemetry, { recursive: true, force: true });
      try {
        rmSync(outReport, { force: true });
      } catch {
        /* ignore */
      }
    }
  });

  it("excludes stub-mode engine_school_influence rows from aggregation", () => {
    const root = findMonorepoRoot();
    const script = join(
      root,
      "packages/shared-engine/learning/scripts/aggregate-learning-telemetry.mjs",
    );
    const tmpTelemetry = mkdtempSync(join(tmpdir(), "alchemist-ltel-"));
    const outReport = join(tmpdir(), `alchemist-fr-${Date.now()}-stub.json`);
    const rows = [
      {
        eventType: "engine_school_influence",
        lessonIds: ["lesson-fetcher-ok"],
        triadSessionId: "sess-fetcher",
        candidatesGenerated: 4,
        passedPanelistValidation: 2,
        bestScore: 0.72,
        timestampUtc: "2026-03-29T12:00:00.000Z",
        mode: "fetcher",
      },
      {
        eventType: "engine_school_influence",
        lessonIds: ["lesson-stub-bad"],
        triadSessionId: "sess-stub",
        candidatesGenerated: 4,
        passedPanelistValidation: 4,
        bestScore: 0.99,
        timestampUtc: "2026-03-29T12:05:00.000Z",
        mode: "stub",
      },
    ];
    writeFileSync(
      join(tmpTelemetry, "day.jsonl"),
      `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`,
      "utf8",
    );
    try {
      execFileSync(process.execPath, [script], {
        cwd: root,
        encoding: "utf8",
        env: {
          ...process.env,
          ALCHEMIST_LEARNING_TELEMETRY_DIR: tmpTelemetry,
          ALCHEMIST_LEARNING_FITNESS_REPORT_OUT: outReport,
          ALCHEMIST_LEARNING_SKIP_INDEX_MERGE: "1",
        },
      });
      const report = JSON.parse(readFileSync(outReport, "utf8")) as {
        lessons: Array<{ lessonId: string }>;
        totalEventsProcessed: number;
        rejectedEvents: Array<{ reason: string }>;
      };
      expect(report.totalEventsProcessed).toBe(1);
      expect(report.lessons.map((l) => l.lessonId)).toContain("lesson-fetcher-ok");
      expect(report.lessons.map((l) => l.lessonId)).not.toContain("lesson-stub-bad");
      expect(report.rejectedEvents.some((r) => r.reason === "forbidden_mode:stub")).toBe(true);
    } finally {
      rmSync(tmpTelemetry, { recursive: true, force: true });
      try {
        rmSync(outReport, { force: true });
      } catch {
        /* ignore */
      }
    }
  });

  it("excludes missing-mode engine_school_influence rows from aggregation", () => {
    const root = findMonorepoRoot();
    const script = join(
      root,
      "packages/shared-engine/learning/scripts/aggregate-learning-telemetry.mjs",
    );
    const tmpTelemetry = mkdtempSync(join(tmpdir(), "alchemist-ltel-"));
    const outReport = join(tmpdir(), `alchemist-fr-${Date.now()}-missing-mode.json`);
    const rows = [
      {
        eventType: "engine_school_influence",
        lessonIds: ["lesson-fetcher-ok"],
        triadSessionId: "sess-fetcher",
        candidatesGenerated: 4,
        passedPanelistValidation: 2,
        bestScore: 0.72,
        timestampUtc: "2026-03-29T12:00:00.000Z",
        mode: "fetcher",
      },
      {
        eventType: "engine_school_influence",
        lessonIds: ["lesson-missing-mode"],
        triadSessionId: "sess-missing",
        candidatesGenerated: 4,
        passedPanelistValidation: 4,
        bestScore: 0.95,
        timestampUtc: "2026-03-29T12:05:00.000Z",
      },
    ];
    writeFileSync(
      join(tmpTelemetry, "day.jsonl"),
      `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`,
      "utf8",
    );
    try {
      execFileSync(process.execPath, [script], {
        cwd: root,
        encoding: "utf8",
        env: {
          ...process.env,
          ALCHEMIST_LEARNING_TELEMETRY_DIR: tmpTelemetry,
          ALCHEMIST_LEARNING_FITNESS_REPORT_OUT: outReport,
          ALCHEMIST_LEARNING_SKIP_INDEX_MERGE: "1",
        },
      });
      const report = JSON.parse(readFileSync(outReport, "utf8")) as {
        lessons: Array<{ lessonId: string }>;
        totalEventsProcessed: number;
        rejectedEvents: Array<{ reason: string }>;
      };
      expect(report.totalEventsProcessed).toBe(1);
      expect(report.lessons.map((l) => l.lessonId)).toContain("lesson-fetcher-ok");
      expect(report.lessons.map((l) => l.lessonId)).not.toContain("lesson-missing-mode");
      expect(report.rejectedEvents.some((r) => r.reason === "missing_mode")).toBe(true);
    } finally {
      rmSync(tmpTelemetry, { recursive: true, force: true });
      try {
        rmSync(outReport, { force: true });
      } catch {
        /* ignore */
      }
    }
  });
});
