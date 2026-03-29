#!/usr/bin/env node
/**
 * Builds a condensed learning index from committed corpus lessons (gitignored output).
 * Does not replace validate-learning-corpus.mjs — run `pnpm learning:verify` for schema gates.
 */
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

function findMonorepoRoot(startDir) {
  let dir = startDir;
  for (let i = 0; i < 28; i += 1) {
    const pj = join(dir, "package.json");
    if (existsSync(pj)) {
      try {
        const pkg = JSON.parse(readFileSync(pj, "utf8"));
        if (pkg.name === "alchemist" && Array.isArray(pkg.workspaces)) return dir;
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

function collectJsonFiles(dir, out, monorepoRoot, errors) {
  if (!existsSync(dir)) return;
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    errors.push(`unreadable directory ${relative(monorepoRoot, dir)}: ${e?.message ?? e}`);
    return;
  }
  for (const ent of entries) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) collectJsonFiles(p, out, monorepoRoot, errors);
    else if (extname(ent.name).toLowerCase() === ".json") {
      try {
        if (!statSync(p).isFile()) errors.push(`not a regular file: ${relative(monorepoRoot, p)}`);
        else out.push(p);
      } catch (e) {
        errors.push(`cannot stat ${relative(monorepoRoot, p)}: ${e?.message ?? e}`);
      }
    }
  }
}

function die(msg) {
  process.stderr.write(`[build-learning-index] ${msg}\n`);
  process.stderr.write(`${JSON.stringify({ status: "error", message: msg })}\n`);
  process.exit(1);
}

/** Caps index size for future prompt packing; full lesson text stays in corpus JSON. */
function truncate(s, maxLen) {
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen);
}

const MAX_CHARACTER_CHARS = 120;
const MAX_CAUSAL_CHARS = 200;

const here = dirname(fileURLToPath(import.meta.url));
const root = findMonorepoRoot(here) ?? findMonorepoRoot(process.cwd());
if (!root) die("monorepo root not found");

const learningRoot = join(root, "packages", "shared-engine", "learning");
const corpusRoot = join(learningRoot, "corpus");
const outputAbs = join(learningRoot, "learning-index.json");
const outputRel = relative(root, outputAbs).split("\\").join("/");

if (!existsSync(corpusRoot)) die(`missing corpus at ${corpusRoot}`);

const files = [];
const collectErrors = [];
collectJsonFiles(corpusRoot, files, root, collectErrors);
if (collectErrors.length) {
  for (const c of collectErrors) process.stderr.write(`[build-learning-index] ${c}\n`);
  die("corpus walk failed");
}

if (files.length === 0) die("no lesson JSON under corpus/");

const INDEX_SCHEMA_VERSION = "1.2";
const ALLOWED_LESSON_SCHEMA = new Set(["1.1", "1.2"]);
const lessons = [];

for (const filePath of files.sort()) {
  const rel = relative(root, filePath).split("\\").join("/");
  let doc;
  try {
    doc = JSON.parse(readFileSync(filePath, "utf8"));
  } catch (e) {
    die(`invalid JSON: ${rel} (${e instanceof Error ? e.message : e})`);
  }
  if (!ALLOWED_LESSON_SCHEMA.has(doc.schemaVersion)) {
    die(
      `${rel}: expected schemaVersion one of ${[...ALLOWED_LESSON_SCHEMA].join(", ")}, got ${JSON.stringify(doc.schemaVersion)}`,
    );
  }
  if (typeof doc.id !== "string" || !doc.id) die(`${rel}: missing id`);
  if (typeof doc.style !== "string" || !doc.style) die(`${rel}: missing style`);
  if (typeof doc.character !== "string" || !doc.character) die(`${rel}: missing character`);
  if (typeof doc.causalReasoning !== "string" || !doc.causalReasoning) die(`${rel}: missing causalReasoning`);
  if (!doc.mappings || typeof doc.mappings !== "object" || Array.isArray(doc.mappings)) {
    die(`${rel}: mappings must be a plain object`);
  }
  const mappingKeys = Object.keys(doc.mappings);
  if (mappingKeys.length === 0) die(`${rel}: mappings must have at least one key`);

  const row = {
    id: doc.id,
    style: doc.style,
    character: truncate(doc.character, MAX_CHARACTER_CHARS),
    causalReasoning: truncate(doc.causalReasoning, MAX_CAUSAL_CHARS),
    tags: Array.isArray(doc.tags) ? doc.tags.filter((t) => typeof t === "string") : [],
    mappingKeys,
  };
  if (Array.isArray(doc.priorityMappingKeys) && doc.priorityMappingKeys.length) {
    row.priorityMappingKeys = doc.priorityMappingKeys.filter((k) => typeof k === "string");
  }
  if (Array.isArray(doc.coreRules) && doc.coreRules.length) {
    row.coreRules = doc.coreRules.map((r) => truncate(String(r), 220));
  }
  if (doc.contrastWith && typeof doc.contrastWith === "object" && doc.contrastWith.lessonId) {
    row.contrastWith = {
      lessonId: String(doc.contrastWith.lessonId),
      difference: truncate(String(doc.contrastWith.difference ?? ""), 220),
    };
  }
  if (typeof doc.difficulty === "string") row.difficulty = doc.difficulty;
  if (typeof doc.lessonVersion === "number" && Number.isFinite(doc.lessonVersion)) {
    row.lessonVersion = doc.lessonVersion;
  }
  if (Array.isArray(doc.antiPatterns)) {
    row.antiPatternCount = doc.antiPatterns.length;
  }
  if (doc.contrastMatrix && typeof doc.contrastMatrix === "object" && typeof doc.contrastMatrix.vs === "string") {
    row.contrastMatrixVs = doc.contrastMatrix.vs;
  }
  if (typeof doc.cluster === "string" && doc.cluster.trim()) {
    row.cluster = doc.cluster.trim();
  }
  lessons.push(row);
}

const fitnessReportPath =
  process.env.ALCHEMIST_LEARNING_FITNESS_REPORT_PATH?.trim()?.length > 0
    ? resolve(process.env.ALCHEMIST_LEARNING_FITNESS_REPORT_PATH.trim())
    : join(root, "artifacts", "learning-fitness-report.json");
/** @type {Map<string, { fitnessScore?: number; fitnessConfidence?: string; sampleCount?: number; stalenessDays?: number }>} */
const fitnessById = new Map();
if (existsSync(fitnessReportPath)) {
  try {
    const fr = JSON.parse(readFileSync(fitnessReportPath, "utf8"));
    for (const e of fr.lessons ?? []) {
      if (!e || typeof e.lessonId !== "string") continue;
      const entry = {};
      if (typeof e.fitnessScore === "number" && Number.isFinite(e.fitnessScore)) entry.fitnessScore = e.fitnessScore;
      if (typeof e.fitnessConfidence === "string") entry.fitnessConfidence = e.fitnessConfidence;
      if (typeof e.sampleCount === "number" && Number.isFinite(e.sampleCount)) entry.sampleCount = e.sampleCount;
      if (typeof e.stalenessDays === "number" && Number.isFinite(e.stalenessDays)) entry.stalenessDays = e.stalenessDays;
      if (Object.keys(entry).length > 0) fitnessById.set(e.lessonId, entry);
    }
  } catch {
    /* ignore */
  }
}
for (const row of lessons) {
  const f = fitnessById.get(row.id);
  if (!f) continue;
  if (f.fitnessScore != null) row.fitnessScore = f.fitnessScore;
  if (f.fitnessConfidence != null) row.fitnessConfidence = f.fitnessConfidence;
  if (f.sampleCount != null) row.sampleCount = f.sampleCount;
  if (f.stalenessDays != null) row.stalenessDays = f.stalenessDays;
}

const lessonCount = lessons.length;
const payload = {
  generatedAtUtc: new Date().toISOString(),
  schemaVersion: INDEX_SCHEMA_VERSION,
  lessonCount,
  lessons,
};
if (existsSync(fitnessReportPath)) {
  try {
    const fr = JSON.parse(readFileSync(fitnessReportPath, "utf8"));
    const lessonFitness = [];
    for (const e of fr.lessons ?? []) {
      if (!e || typeof e.lessonId !== "string") continue;
      const row = { lessonId: e.lessonId };
      if (typeof e.fitnessScore === "number" && Number.isFinite(e.fitnessScore)) row.fitnessScore = e.fitnessScore;
      if (typeof e.fitnessConfidence === "string") row.fitnessConfidence = e.fitnessConfidence;
      if (typeof e.sampleCount === "number" && Number.isFinite(e.sampleCount)) row.sampleCount = e.sampleCount;
      if (typeof e.stalenessDays === "number" && Number.isFinite(e.stalenessDays)) row.stalenessDays = e.stalenessDays;
      if (typeof e.validRate === "number" && Number.isFinite(e.validRate)) row.validRate = e.validRate;
      if (typeof e.qualityScore === "number" && Number.isFinite(e.qualityScore)) row.qualityScore = e.qualityScore;
      lessonFitness.push(row);
    }
    payload.fitnessSnapshot = {
      generatedAtUtc: new Date().toISOString(),
      aggregationVersion: fr.aggregationVersion ?? 2,
      lessonFitness,
      learningOutcomes: fr.learningOutcomes,
      coverage: fr.coverage ?? {},
      totalEventsProcessed: fr.totalEventsProcessed ?? 0,
    };
  } catch {
    /* ignore */
  }
}

try {
  writeFileSync(outputAbs, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
} catch (e) {
  die(`write failed: ${outputAbs} (${e instanceof Error ? e.message : e})`);
}

process.stdout.write(
  `${JSON.stringify({ status: "ok", lessonCount, outputPath: outputRel })}\n`,
);
