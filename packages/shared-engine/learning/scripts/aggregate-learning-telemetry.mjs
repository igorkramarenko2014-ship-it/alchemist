#!/usr/bin/env node
/**
 * Aggregate `artifacts/learning-telemetry/*.jsonl` into lesson fitness + AIOM `learningOutcomes`.
 * Writes `artifacts/learning-fitness-report.json` (aggregationVersion 3) and merges `fitnessSnapshot`
 * into `learning-index.json` when present.
 *
 * Fitness v1 (per lesson, rolling evidence from JSONL):
 *   fitnessV1 = 0.45*validRate + 0.35*qualityScore + 0.20*logScaledUsageRate
 * Confidence: unique triadSessionId count — low &lt;10, medium 10–19, high ≥20.
 *
 * Usage (repo root): node packages/shared-engine/learning/scripts/aggregate-learning-telemetry.mjs
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SAMPLE_HIGH = 20;
const SAMPLE_MEDIUM = 10;

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

function clamp01(x) {
  return Math.min(1, Math.max(0, x));
}

function fitnessConfidenceFromSampleCount(n) {
  if (n >= SAMPLE_HIGH) return "high";
  if (n >= SAMPLE_MEDIUM) return "medium";
  return "low";
}

function daysSinceIso(iso) {
  if (!iso || typeof iso !== "string") return 999;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 999;
  return Math.max(0, Math.floor((Date.now() - t) / (86400 * 1000)));
}

const here = dirname(fileURLToPath(import.meta.url));
const root = findMonorepoRoot(here) ?? findMonorepoRoot(process.cwd());
if (!root) {
  process.stderr.write("[aggregate-learning-telemetry] monorepo root not found\n");
  process.exit(1);
}

const telemetryDir =
  process.env.ALCHEMIST_LEARNING_TELEMETRY_DIR?.trim()?.length > 0
    ? resolve(process.env.ALCHEMIST_LEARNING_TELEMETRY_DIR.trim())
    : join(root, "artifacts", "learning-telemetry");
const reportPath =
  process.env.ALCHEMIST_LEARNING_FITNESS_REPORT_OUT?.trim()?.length > 0
    ? resolve(process.env.ALCHEMIST_LEARNING_FITNESS_REPORT_OUT.trim())
    : join(root, "artifacts", "learning-fitness-report.json");
const indexPath = join(root, "packages", "shared-engine", "learning", "learning-index.json");
const skipIndexMerge = process.env.ALCHEMIST_LEARNING_SKIP_INDEX_MERGE === "1";

const events = loadJsonlEvents(telemetryDir).filter(
  (e) => e && e.eventType === "engine_school_influence",
);

/** @type {Map<string, { sessionIds: Set<string>, validRatios: number[], bestScores: number[], lastUsed: string, weightSum: number, contexts: Set<string> }>} */
const lessonMap = new Map();

for (const ev of events) {
  const ids = Array.isArray(ev.lessonIds) ? ev.lessonIds.filter((x) => typeof x === "string") : [];
  const sid = typeof ev.triadSessionId === "string" && ev.triadSessionId ? ev.triadSessionId : "";
  const raw = typeof ev.candidatesGenerated === "number" && Number.isFinite(ev.candidatesGenerated) ? ev.candidatesGenerated : 0;
  const passed =
    typeof ev.passedPanelistValidation === "number" && Number.isFinite(ev.passedPanelistValidation)
      ? ev.passedPanelistValidation
      : 0;
  const denom = Math.max(raw, 1);
  const validRatio = clamp01(passed / denom);
  const best = typeof ev.bestScore === "number" && Number.isFinite(ev.bestScore) ? ev.bestScore : null;

  for (const id of ids) {
    if (!lessonMap.has(id)) {
      lessonMap.set(id, {
        sessionIds: new Set(),
        validRatios: [],
        bestScores: [],
        lastUsed: "",
        contexts: new Set(),
      });
    }
    const stats = lessonMap.get(id);
    if (sid) stats.sessionIds.add(sid);
    stats.validRatios.push(validRatio);
    if (best != null) stats.bestScores.push(best);
    if (ev.timestampUtc && (!stats.lastUsed || new Date(ev.timestampUtc) > new Date(stats.lastUsed))) {
      stats.lastUsed = ev.timestampUtc;
    }
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
  }
}

let maxUniqueSessions = 1;
for (const s of lessonMap.values()) {
  maxUniqueSessions = Math.max(maxUniqueSessions, s.sessionIds.size);
}

const lessons = Array.from(lessonMap.entries()).map(([lessonId, stats]) => {
  const sampleCount = stats.sessionIds.size;
  const validRate =
    stats.validRatios.length > 0
      ? stats.validRatios.reduce((a, b) => a + b, 0) / stats.validRatios.length
      : 0;
  const qualityScore =
    stats.bestScores.length > 0
      ? stats.bestScores.reduce((a, b) => a + b, 0) / stats.bestScores.length
      : 0;
  const logScaledUsageRate = clamp01(Math.log1p(sampleCount) / Math.log1p(maxUniqueSessions));
  const fitnessScore = clamp01(
    0.45 * validRate + 0.35 * qualityScore + 0.2 * logScaledUsageRate,
  );
  const fitnessConfidence = fitnessConfidenceFromSampleCount(sampleCount);
  const stalenessDays = daysSinceIso(stats.lastUsed);

  return {
    lessonId,
    sampleCount,
    validRate: Number(validRate.toFixed(4)),
    qualityScore: Number(qualityScore.toFixed(4)),
    logScaledUsageRate: Number(logScaledUsageRate.toFixed(4)),
    fitnessScore: Number(fitnessScore.toFixed(4)),
    fitnessConfidence,
    stalenessDays,
    lastUsed: stats.lastUsed || "",
    contexts: Array.from(stats.contexts),
    markForReview: fitnessScore < 0.25 && sampleCount > 50,
  };
});

lessons.sort((a, b) => b.fitnessScore - a.fitnessScore || a.lessonId.localeCompare(b.lessonId));

const totalRuns = events.length;
const influencedRuns = events.filter((e) => Array.isArray(e.lessonIds) && e.lessonIds.length > 0).length;
const uniqueTriadSessions = new Set(
  events.map((e) => (typeof e.triadSessionId === "string" ? e.triadSessionId : "")).filter(Boolean),
).size;

/** @type {Map<string, { events: typeof events }>} */
const sessionMap = new Map();
for (const ev of events) {
  const sid = typeof ev.triadSessionId === "string" && ev.triadSessionId ? ev.triadSessionId : `_noid_${ev.runId ?? Math.random()}`;
  if (!sessionMap.has(sid)) sessionMap.set(sid, { events: [] });
  sessionMap.get(sid).events.push(ev);
}

let lessonSessions = 0;
let successSessions = 0;
let clusterHitSessions = 0;
for (const { events: sessEv } of sessionMap.values()) {
  const hasLesson = sessEv.some((e) => Array.isArray(e.lessonIds) && e.lessonIds.length > 0);
  if (!hasLesson) continue;
  lessonSessions += 1;
  const ok = sessEv.some(
    (e) => (e.passedPanelistValidation ?? 0) > 0 && e.bestScore != null && Number.isFinite(e.bestScore),
  );
  if (ok) successSessions += 1;
  const clusterHit = sessEv.some(
    (e) => Array.isArray(e.selectedClusters) && e.selectedClusters.length > 0,
  );
  if (clusterHit) clusterHitSessions += 1;
}

const candidateSuccessRate = lessonSessions > 0 ? successSessions / lessonSessions : 0;
const tasteClusterHitRate = lessonSessions > 0 ? clusterHitSessions / lessonSessions : 0;

const bestScoresInfluenced = events
  .filter((e) => Array.isArray(e.lessonIds) && e.lessonIds.length > 0)
  .map((e) => e.bestScore)
  .filter((x) => typeof x === "number" && Number.isFinite(x));
const meanBestScoreWithLessons =
  bestScoresInfluenced.length > 0
    ? bestScoresInfluenced.reduce((a, b) => a + b, 0) / bestScoresInfluenced.length
    : 0;

/** Placeholder until `score_candidates` lines exist in JSONL (Phase 2 telemetry). */
const orderChangeRate = 0;

const learningOutcomes = {
  candidateSuccessRate: Number(candidateSuccessRate.toFixed(4)),
  meanBestScoreWithLessons: Number(meanBestScoreWithLessons.toFixed(4)),
  orderChangeRate: Number(orderChangeRate.toFixed(4)),
  tasteClusterHitRate: Number(tasteClusterHitRate.toFixed(4)),
  authoritative: false,
  note:
    "Non-authoritative quality trend for AIOM display only. orderChangeRate is 0 until score_candidates JSONL is aggregated; does not affect MON or integrity.",
};

const coverage = {
  learningCoverage: totalRuns > 0 ? Number((influencedRuns / totalRuns).toFixed(4)) : 0,
  styleCoverage: new Set(lessons.flatMap((l) => l.contexts ?? [])).size,
  uniqueTriadSessions,
};

const reportPayload = {
  aggregationVersion: 3,
  aggregationKind: "log_backed_engine_school_influence_jsonl_v1_fitness",
  generatedAtUtc: new Date().toISOString(),
  provenance:
    "Fitness v1: 0.45*validRate + 0.35*qualityScore + 0.20*logScaledUsageRate per lesson. validRate = mean(panelist passedPanelistValidation/max(candidatesGenerated,1)). sampleCount = unique triadSessionId per lesson. confidence: high≥20, medium≥10, else low. learningOutcomes: non-authoritative; orderChangeRate placeholder until score_candidates telemetry is aggregated.",
  totalEventsProcessed: events.length,
  uniqueTriadSessions,
  learningOutcomes,
  lessons,
  coverage,
};

const snapshot = {
  generatedAtUtc: new Date().toISOString(),
  aggregationVersion: 3,
  lessonFitness: lessons,
  learningOutcomes,
  coverage,
  totalEventsProcessed: events.length,
};

mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(reportPath, `${JSON.stringify(reportPayload, null, 2)}\n`, "utf8");

if (existsSync(indexPath) && !skipIndexMerge) {
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
    aggregationVersion: 3,
  })}\n`,
);
