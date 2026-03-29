#!/usr/bin/env node
/**
 * Aggregate `artifacts/learning-telemetry/*.jsonl` into lesson fitness + coverage.
 * Writes `artifacts/learning-fitness-report.json` and merges `fitnessSnapshot` into
 * `packages/shared-engine/learning/learning-index.json` when that file exists (pnpm learning:build-index).
 *
 * Usage (repo root): node packages/shared-engine/learning/scripts/aggregate-learning-telemetry.mjs
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

function findMonorepoRoot(startDir) {
  let dir = startDir;
  for (let i = 0; i < 28; i += 1) {
    const pj = join(dir, "package.json");
    if (existsSync(pj)) {
      try {
        const j = JSON.parse(readFileSync(pj, "utf8"));
        if (j.name === "alchemist" && Array.isArray(j.workspaces)) return dir;
      } catch {
        /* ignore */
      }
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function recencyFactor(ts) {
  const t = new Date(ts).getTime();
  if (Number.isNaN(t)) return 0;
  const daysOld = (Date.now() - t) / (1000 * 60 * 60 * 24);
  return Math.max(0, 1 - daysOld / 60);
}

function loadJsonlEvents(telemetryDir) {
  if (!existsSync(telemetryDir)) return [];
  const files = readdirSync(telemetryDir).filter((f) => f.endsWith(".jsonl"));
  const events = [];
  for (const file of files) {
    const p = join(telemetryDir, file);
    const text = readFileSync(p, "utf8");
    for (const line of text.split("\n")) {
      const s = line.trim();
      if (!s) continue;
      try {
        events.push(JSON.parse(s));
      } catch {
        /* skip bad line */
      }
    }
  }
  return events;
}

const here = dirname(fileURLToPath(import.meta.url));
const root = findMonorepoRoot(here) ?? findMonorepoRoot(process.cwd());
if (!root) {
  process.stderr.write("[aggregate-learning-telemetry] monorepo root not found\n");
  process.exit(1);
}

const telemetryDir = join(root, "artifacts", "learning-telemetry");
const reportPath = join(root, "artifacts", "learning-fitness-report.json");
const indexPath = join(root, "packages", "shared-engine", "learning", "learning-index.json");

const events = loadJsonlEvents(telemetryDir).filter(
  (e) => e && e.eventType === "engine_school_influence",
);

const lessonMap = new Map();

for (const ev of events) {
  const weight = recencyFactor(ev.timestampUtc ?? "");
  const ids = Array.isArray(ev.lessonIds) ? ev.lessonIds.filter((x) => typeof x === "string") : [];
  const delta =
    typeof ev.deltaScore === "number" && Number.isFinite(ev.deltaScore) ? ev.deltaScore : 0;
  const passLift =
    typeof ev.passLift === "number" && Number.isFinite(ev.passLift)
      ? ev.passLift
      : typeof ev.panelistPassRate === "number"
        ? ev.panelistPassRate
        : 0;
  let scoreLift = 0;
  if (
    typeof ev.bestScore === "number" &&
    typeof ev.baselineScore === "number" &&
    Number.isFinite(ev.bestScore) &&
    Number.isFinite(ev.baselineScore)
  ) {
    scoreLift = ev.bestScore - ev.baselineScore;
  }

  for (const id of ids) {
    if (!lessonMap.has(id)) {
      lessonMap.set(id, {
        usageCount: 0,
        totalDeltaScore: 0,
        totalPassLift: 0,
        totalScoreLift: 0,
        contexts: new Set(),
        lastUsed: ev.timestampUtc ?? "",
      });
    }
    const stats = lessonMap.get(id);
    stats.usageCount += 1;
    stats.totalDeltaScore += delta * weight;
    stats.totalPassLift += passLift * weight;
    stats.totalScoreLift += scoreLift * weight;
    if (Array.isArray(ev.fitnessContext)) {
      for (const c of ev.fitnessContext) {
        if (typeof c === "string") stats.contexts.add(c);
      }
    }
    if (Array.isArray(ev.selectedClusters)) {
      for (const c of ev.selectedClusters) {
        if (typeof c === "string" && c.trim()) stats.contexts.add(`cluster:${c.trim()}`);
      }
    }
    if (ev.timestampUtc && (!stats.lastUsed || new Date(ev.timestampUtc) > new Date(stats.lastUsed))) {
      stats.lastUsed = ev.timestampUtc;
    }
  }
}

const lessons = Array.from(lessonMap.entries()).map(([id, stats]) => {
  const n = stats.usageCount || 1;
  const avgDelta = stats.totalDeltaScore / n;
  const avgPassLift = stats.totalPassLift / n;
  const avgScoreLift = stats.totalScoreLift / n;
  /** Tunable 0..1 — usage saturation + panelist pass proxy + score delta (baseline often null → scoreLift 0). */
  const usageNorm = Math.min(1, stats.usageCount / 50);
  const fitnessScore = Math.min(
    1,
    Math.max(
      0,
      usageNorm * 0.2 + avgPassLift * 0.4 + avgScoreLift * 0.25 + avgDelta * 0.15,
    ),
  );

  return {
    lessonId: id,
    usageCount: stats.usageCount,
    avgPassLift: Number(avgPassLift.toFixed(4)),
    avgScoreLift: Number(avgScoreLift.toFixed(4)),
    avgDeltaScore: Number(avgDelta.toFixed(4)),
    fitnessScore: Number(fitnessScore.toFixed(4)),
    contexts: Array.from(stats.contexts),
    lastUsed: stats.lastUsed,
    markForReview: fitnessScore < 0.25 && stats.usageCount > 50,
  };
});

lessons.sort((a, b) => b.fitnessScore - a.fitnessScore || a.lessonId.localeCompare(b.lessonId));

const totalRuns = events.length;
const influencedRuns = events.filter((e) => Array.isArray(e.lessonIds) && e.lessonIds.length > 0).length;
const uniqueTriadSessions = new Set(
  events.map((e) => (typeof e.triadSessionId === "string" ? e.triadSessionId : "")).filter(Boolean),
).size;
const coverage = {
  learningCoverage: totalRuns > 0 ? Number((influencedRuns / totalRuns).toFixed(4)) : 0,
  styleCoverage: new Set(lessons.flatMap((l) => l.contexts)).size,
  uniqueTriadSessions,
};

const reportPayload = {
  aggregationVersion: 2,
  aggregationKind: "log_backed_engine_school_influence_jsonl",
  generatedAtUtc: new Date().toISOString(),
  provenance:
    "Per-lesson fitness blends recency-weighted usage, panelist-route pass proxy (panelistPassRate / passLift), and score lift when baselineScore is present in JSONL rows. Evidence is pre-client-gate (route isValidCandidate only) — Slavic/Undercover unchanged and not logged here.",
  totalEventsProcessed: events.length,
  uniqueTriadSessions,
  lessons,
  coverage,
};

const snapshot = {
  generatedAtUtc: new Date().toISOString(),
  lessonFitness: lessons,
  coverage,
  totalEventsProcessed: events.length,
};

mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(reportPath, `${JSON.stringify(reportPayload, null, 2)}\n`, "utf8");

if (existsSync(indexPath)) {
  try {
    const index = JSON.parse(readFileSync(indexPath, "utf8"));
    index.fitnessSnapshot = snapshot;
    writeFileSync(indexPath, `${JSON.stringify(index, null, 2)}\n`, "utf8");
  } catch (e) {
    process.stderr.write(
      `[aggregate-learning-telemetry] skip index merge: ${e instanceof Error ? e.message : e}\n`,
    );
  }
}

process.stdout.write(
  `${JSON.stringify({
    status: "ok",
    eventsProcessed: events.length,
    lessonsAssessed: lessons.length,
    learningCoverage: coverage.learningCoverage,
    reportPath: relative(root, reportPath),
  })}\n`,
);
