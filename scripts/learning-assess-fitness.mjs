#!/usr/bin/env node
/**
 * Offline Engine School fitness snapshot (v0): corpus structure + static heuristics.
 * Followed by **`aggregate-learning-telemetry.mjs`** via **`pnpm learning:assess-fitness`** (merges JSONL-derived
 * **`fitnessSnapshot`** into **`learning-index.json`** when present and writes **`artifacts/learning-fitness-report.json`**).
 *
 * Usage (repo root):  pnpm learning:assess-fitness   (or node scripts/learning-assess-fitness.mjs for static only)
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

function findMonorepoRoot(startDir) {
  let dir = startDir;
  for (let i = 0; i < 24; i += 1) {
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

function collectJson(dir, out, root, errors) {
  if (!existsSync(dir)) return;
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) collectJson(p, out, root, errors);
    else if (extname(ent.name).toLowerCase() === ".json") {
      try {
        if (statSync(p).isFile()) out.push(p);
      } catch (e) {
        errors.push(`${relative(root, p)}: ${e?.message ?? e}`);
      }
    }
  }
}

const here = dirname(fileURLToPath(import.meta.url));
const root = findMonorepoRoot(here) ?? findMonorepoRoot(process.cwd());
if (!root) {
  process.stderr.write("[learning-assess-fitness] monorepo root not found\n");
  process.exit(1);
}

const corpusRoot = join(root, "packages", "shared-engine", "learning", "corpus");
const errors = [];
const files = [];
collectJson(corpusRoot, files, root, errors);
if (errors.length) {
  for (const e of errors) process.stderr.write(`[learning-assess-fitness] ${e}\n`);
  process.exit(1);
}

const lessons = [];
for (const fp of files.sort()) {
  let doc;
  try {
    doc = JSON.parse(readFileSync(fp, "utf8"));
  } catch (e) {
    process.stderr.write(`[learning-assess-fitness] invalid JSON ${relative(root, fp)}\n`);
    process.exit(1);
  }
  if (typeof doc.id !== "string" || !doc.id) continue;
  const antiN = Array.isArray(doc.antiPatterns) ? doc.antiPatterns.length : 0;
  const heurN = Array.isArray(doc.heuristics) ? doc.heuristics.length : 0;
  const hasContrast = Boolean(doc.contrastMatrix && typeof doc.contrastMatrix.vs === "string");
  /** Static v0 score: richer pedagogy metadata → slightly higher (0..1), until real lifts exist. */
  const hasCluster = typeof doc.cluster === "string" && doc.cluster.trim().length > 0;
  const fitnessStatic = Math.min(
    1,
    0.35 +
      antiN * 0.12 +
      heurN * 0.08 +
      (hasContrast ? 0.1 : 0) +
      (typeof doc.lessonVersion === "number" ? 0.05 : 0) +
      (hasCluster ? 0.06 : 0),
  );
  lessons.push({
    id: doc.id,
    style: typeof doc.style === "string" ? doc.style : "",
    difficulty: typeof doc.difficulty === "string" ? doc.difficulty : null,
    lessonVersion: typeof doc.lessonVersion === "number" ? doc.lessonVersion : null,
    antiPatternCount: antiN,
    heuristicCount: heurN,
    hasContrastMatrix: hasContrast,
    hasCluster,
    fitnessStatic,
    note: "Static v0 only — log-backed fitness comes from aggregate-learning-telemetry (JSONL)",
  });
}

const styles = new Set(lessons.map((l) => l.style.trim().toLowerCase()).filter(Boolean));

process.stderr.write(
  "[learning-assess-fitness] static v0 metadata heuristic complete — next: aggregate-learning-telemetry (JSONL → learning-fitness-report.json)\n",
);

process.stdout.write(
  `${JSON.stringify(
    {
      status: "ok",
      pipeline: "static_metadata_v0",
      generatedAtUtc: new Date().toISOString(),
      lessonCount: lessons.length,
      styleCoverageCount: styles.size,
      lessons: lessons.sort((a, b) => b.fitnessStatic - a.fitnessStatic || a.id.localeCompare(b.id)),
    },
    null,
    2,
  )}\n`,
);
