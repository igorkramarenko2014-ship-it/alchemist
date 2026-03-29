#!/usr/bin/env node
/**
 * Builds a condensed learning index from committed corpus lessons (gitignored output).
 * Does not replace validate-learning-corpus.mjs — run `pnpm learning:verify` for schema gates.
 */
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, join, relative } from "node:path";
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

const INDEX_SCHEMA_VERSION = "1.0";
const lessons = [];

for (const filePath of files.sort()) {
  const rel = relative(root, filePath).split("\\").join("/");
  let doc;
  try {
    doc = JSON.parse(readFileSync(filePath, "utf8"));
  } catch (e) {
    die(`invalid JSON: ${rel} (${e instanceof Error ? e.message : e})`);
  }
  if (doc.schemaVersion !== INDEX_SCHEMA_VERSION) {
    die(`${rel}: expected schemaVersion "${INDEX_SCHEMA_VERSION}", got ${JSON.stringify(doc.schemaVersion)}`);
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
  lessons.push(row);
}

const lessonCount = lessons.length;
const payload = {
  generatedAtUtc: new Date().toISOString(),
  schemaVersion: INDEX_SCHEMA_VERSION,
  lessonCount,
  lessons,
};

try {
  writeFileSync(outputAbs, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
} catch (e) {
  die(`write failed: ${outputAbs} (${e instanceof Error ? e.message : e})`);
}

process.stdout.write(
  `${JSON.stringify({ status: "ok", lessonCount, outputPath: outputRel })}\n`,
);
