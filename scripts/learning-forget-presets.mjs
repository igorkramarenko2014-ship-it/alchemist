#!/usr/bin/env node
/**
 * Strips raw preset binaries and pack-only media from packages/shared-engine/learning.
 * Intended flow: capture structured lessons (JSON under corpus/) first, then run this so
 * the tree keeps abstract "logic" (lessons + schema) without binary preset artifacts.
 *
 * Scope is HARD-LIMITED to shared-engine/learning — never touches fxp-encoder or apps.
 *
 * Usage (repo root):
 *   node scripts/learning-forget-presets.mjs
 *   pnpm learning:forget-presets
 *   LEARNING_FORGET_DRY_RUN=1 pnpm learning:forget-presets
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join } from "node:path";
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

const BINARY_EXT = new Set([".fxp", ".fxb", ".fxp1", ".aupreset"]);
const MEDIA_EXT = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".tif", ".tiff"]);

function shouldRemoveTextNoise(filePath) {
  const base = basename(filePath);
  if (!base.toLowerCase().endsWith(".txt")) return false;
  const lower = base.toLowerCase();
  if (lower.startsWith("important")) return true;
  if (base.includes("ВАЖНО") || lower.includes("vazhno")) return true;
  return false;
}

function shouldRemoveByExt(filePath) {
  const ext = extname(filePath).toLowerCase();
  return BINARY_EXT.has(ext) || MEDIA_EXT.has(ext);
}

function shouldRemoveOsJunk(filePath) {
  const base = basename(filePath);
  return base === ".DS_Store" || base === "Thumbs.db" || base === "desktop.ini";
}

function walkFiles(rootDir, out = []) {
  if (!existsSync(rootDir)) return out;
  for (const ent of readdirSync(rootDir, { withFileTypes: true })) {
    const p = join(rootDir, ent.name);
    if (ent.isDirectory()) walkFiles(p, out);
    else out.push(p);
  }
  return out;
}

function removeEmptyNestedDirs(dir, protectedAbs) {
  if (!existsSync(dir)) return;
  if (protectedAbs.has(dir)) {
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      if (ent.isDirectory()) removeEmptyNestedDirs(join(dir, ent.name), protectedAbs);
    }
    return;
  }
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    if (ent.isDirectory()) removeEmptyNestedDirs(join(dir, ent.name), protectedAbs);
  }
  const after = readdirSync(dir);
  if (after.length === 0) rmSync(dir, { recursive: true });
}

const here = dirname(fileURLToPath(import.meta.url));
const root = findMonorepoRoot(here) ?? findMonorepoRoot(process.cwd());
if (!root) {
  process.stderr.write("[learning-forget-presets] monorepo root not found\n");
  process.exit(1);
}

const learningRoot = join(root, "packages", "shared-engine", "learning");
if (!existsSync(learningRoot)) {
  process.stderr.write(`[learning-forget-presets] missing ${learningRoot}\n`);
  process.exit(1);
}

const dryRun = process.env.LEARNING_FORGET_DRY_RUN === "1";

const allFiles = walkFiles(learningRoot);
const toDelete = allFiles.filter((p) => {
  if (dirname(p) === join(learningRoot, "schema")) return false;
  const rel = p.replace(learningRoot, "");
  if (basename(p) === "README.md" && dirname(p) === learningRoot) return false;
  if (shouldRemoveByExt(p)) return true;
  if (shouldRemoveTextNoise(p)) return true;
  if (shouldRemoveOsJunk(p)) return true;
  return false;
});

let removed = 0;
if (dryRun) {
  removed = toDelete.length;
  process.stdout.write(`[dry-run] would delete ${removed} file(s)\n`);
  const preview = toDelete.slice(0, 5);
  for (const p of preview) process.stdout.write(`  - ${p}\n`);
  if (removed > preview.length) process.stdout.write(`  … and ${removed - preview.length} more\n`);
} else {
  for (const p of toDelete) {
    try {
      unlinkSync(p);
      removed += 1;
    } catch (e) {
      process.stderr.write(`[learning-forget-presets] failed: ${p} ${e?.message ?? e}\n`);
      process.exit(1);
    }
  }
}

if (!dryRun) {
  const protectedAbs = new Set([
    learningRoot,
    join(learningRoot, "presets"),
    join(learningRoot, "corpus"),
    join(learningRoot, "schema"),
  ]);
  for (const top of ["presets", "corpus", "schema"]) {
    const d = join(learningRoot, top);
    if (existsSync(d)) removeEmptyNestedDirs(d, protectedAbs);
  }
  for (const slot of ["presets", "corpus"]) {
    const d = join(learningRoot, slot);
    if (!existsSync(d)) mkdirSync(d, { recursive: true });
    const gitkeep = join(d, ".gitkeep");
    if (!existsSync(gitkeep)) writeFileSync(gitkeep, "", "utf8");
  }
}

process.stdout.write(
  `[learning-forget-presets] ${dryRun ? "dry-run" : "done"}: ${removed} file(s) ${dryRun ? "would be " : ""}removed under learning/\n`,
);
process.stdout.write(
  "[learning-forget-presets] retained: corpus/*.json, *.md lessons, schema/, README.md, .gitkeep, and TypeScript helpers in learning/\n",
);
