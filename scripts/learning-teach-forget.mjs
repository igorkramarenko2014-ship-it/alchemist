#!/usr/bin/env node
/**
 * Run Lesson (RL): validate corpus → print human-readable “class” from each lesson JSON →
 * strip stray binaries under learning/ via learning-forget-presets (DL/ never touched).
 *
 * Committed corpus is abstract pedagogy only — not resale of vendor presets.
 *
 * Usage (repo root):
 *   pnpm learning:teach
 *   pnpm learning:rl
 *   LEARNING_TEACH_SKIP_FORGET=1 pnpm learning:teach   # teach only, no forget step
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

function findMonorepoRoot(startDir) {
  let dir = startDir;
  for (let i = 0; i < 24; i += 1) {
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

function walkCorpusJson(dir, out) {
  if (!existsSync(dir)) return;
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) walkCorpusJson(p, out);
    else if (extname(ent.name).toLowerCase() === ".json") {
      try {
        if (statSync(p).isFile()) out.push(p);
      } catch {
        /* ignore */
      }
    }
  }
}

const here = dirname(fileURLToPath(import.meta.url));
const root = findMonorepoRoot(here) ?? findMonorepoRoot(process.cwd());
if (!root) {
  process.stderr.write("[learning-teach-forget] monorepo root not found\n");
  process.exit(1);
}

const validateScript = join(root, "scripts", "validate-learning-corpus.mjs");
const forgetScript = join(root, "scripts", "learning-forget-presets.mjs");
const skipForget = process.env.LEARNING_TEACH_SKIP_FORGET === "1";

process.stderr.write("[learning-teach-forget] validating corpus…\n");
try {
  execFileSync(process.execPath, [validateScript], { cwd: root, stdio: "inherit" });
} catch {
  process.stderr.write("[learning-teach-forget] corpus validation failed — fix lessons then retry.\n");
  process.exit(1);
}

const corpusRoot = join(root, "packages", "shared-engine", "learning", "corpus");
const files = [];
walkCorpusJson(corpusRoot, files);
files.sort((a, b) => a.localeCompare(b));

if (files.length === 0) {
  process.stderr.write("[learning-teach-forget] no lesson JSON under corpus/\n");
  process.exit(1);
}

const rel = (p) => relative(root, p);

process.stdout.write(`
${"=".repeat(78)}
 ENGINE SCHOOL — Run Lesson (corpus is abstract logic; not vendor preset bytes)
${"=".repeat(78)}
 Lessons on disk: ${files.length}
 Read each block aloud or share — then run hygiene (forget-presets) unless LEARNING_TEACH_SKIP_FORGET=1.
${"-".repeat(78)}
`);

let n = 0;
for (const fp of files) {
  n += 1;
  let lesson;
  try {
    lesson = JSON.parse(readFileSync(fp, "utf8"));
  } catch (e) {
    process.stderr.write(`[learning-teach-forget] invalid JSON: ${rel(fp)} ${e?.message ?? e}\n`);
    process.exit(1);
  }

  const id = lesson.id ?? "(missing id)";
  const label = lesson.presetName ?? "(label)";
  const style = lesson.style ?? "";
  const tags = Array.isArray(lesson.tags) ? lesson.tags.join(", ") : "";
  const mappings = lesson.mappings && typeof lesson.mappings === "object" ? lesson.mappings : {};

  process.stdout.write(`
${"─".repeat(78)}
 Lesson ${n} / ${files.length}  —  ${id}
 File: ${rel(fp)}
${"─".repeat(78)}
 Label:     ${label}
 Style:    ${style}
${tags ? ` Tags:     ${tags}\n` : ""}
${Array.isArray(lesson.priorityMappingKeys) && lesson.priorityMappingKeys.length ? `--- Priority (2–3 knobs that define the archetype) ---\n${lesson.priorityMappingKeys.map((k) => `  • ${k}`).join("\n")}\n` : ""}${Array.isArray(lesson.coreRules) && lesson.coreRules.length ? `--- Core rules (minimal causal compression) ---\n${lesson.coreRules.map((r) => `  • ${r}`).join("\n")}\n` : ""}${lesson.contrastWith && typeof lesson.contrastWith === "object" ? `--- Contrast vs ${lesson.contrastWith.lessonId ?? "?"} ---\n${lesson.contrastWith.difference ?? ""}\n` : ""}--- Character (what humans hear) ---
${lesson.character ?? ""}

--- Causal reasoning (why the mapping logic does that) ---
${lesson.causalReasoning ?? ""}

--- Mapping families (AI ↔ human grammar) ---
`);
  const keys = Object.keys(mappings).sort();
  for (const k of keys) {
    const v = mappings[k];
    const line = typeof v === "string" ? v : JSON.stringify(v);
    process.stdout.write(`  • ${k}: ${line}\n`);
  }
}

process.stdout.write(`
${"=".repeat(78)}
 End of lesson run — corpus text only; binaries belong in DL/ (local) or nowhere in git.
${"=".repeat(78)}
`);

if (skipForget) {
  process.stderr.write("[learning-teach-forget] LEARNING_TEACH_SKIP_FORGET=1 — skipped forget-presets.\n");
  process.exit(0);
}

process.stderr.write("[learning-teach-forget] running learning-forget-presets (DL/ untouched)…\n");
try {
  execFileSync(process.execPath, [forgetScript], { cwd: root, stdio: "inherit" });
} catch {
  process.exit(1);
}
