#!/usr/bin/env node
/**
 * Strips raw preset binaries and pack-only media from packages/shared-engine/learning,
 * except the entire DL/ subtree (pending downloads — never touched).
 *
 * Intended flow: author structured lessons under corpus/, then run this so corpus stays
 * logic-only while DL/ remains the operator-controlled staging area.
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

/** Preset binaries + pack images + typical sample-loop / DAW detritus (outside DL/ only). */
const REMOVABLE_PACK_EXT = new Set([
  ".fxp",
  ".fxb",
  ".fxp1",
  ".aupreset",
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".bmp",
  ".tif",
  ".tiff",
  ".wav",
  ".aif",
  ".aiff",
  ".mp3",
  ".flac",
  ".ogg",
  ".m4a",
  ".mid",
  ".midi",
  ".als",
  ".pdf",
]);

function pendingDownloadsRoot(learningRoot) {
  return join(learningRoot, "DL");
}

function isUnderPendingDownloads(filePath, learningRoot) {
  const dl = pendingDownloadsRoot(learningRoot);
  return filePath === dl || filePath.startsWith(`${dl}/`);
}

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
  return REMOVABLE_PACK_EXT.has(ext);
}

function shouldRemoveOsJunk(filePath) {
  const base = basename(filePath);
  return base === ".DS_Store" || base === "Thumbs.db" || base === "desktop.ini";
}

function walkFiles(rootDir, learningRoot, out = []) {
  if (!existsSync(rootDir)) return out;
  for (const ent of readdirSync(rootDir, { withFileTypes: true })) {
    const p = join(rootDir, ent.name);
    if (ent.isDirectory()) {
      if (isUnderPendingDownloads(p, learningRoot)) continue;
      walkFiles(p, learningRoot, out);
    } else {
      if (!isUnderPendingDownloads(p, learningRoot)) out.push(p);
    }
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

const allFiles = walkFiles(learningRoot, learningRoot);
const toDelete = allFiles.filter((p) => {
  if (isUnderPendingDownloads(p, learningRoot)) return false;
  if (dirname(p) === join(learningRoot, "schema")) return false;
  if (basename(p) === "README.md" && dirname(p) === learningRoot) return false;
  if (shouldRemoveByExt(p)) return true;
  if (shouldRemoveTextNoise(p)) return true;
  if (shouldRemoveOsJunk(p)) return true;
  return false;
});

let removed = 0;
if (dryRun) {
  removed = toDelete.length;
  process.stdout.write(`[dry-run] would delete ${removed} file(s) (DL/ excluded)\n`);
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
    join(learningRoot, "corpus"),
    join(learningRoot, "schema"),
    pendingDownloadsRoot(learningRoot),
  ]);
  for (const top of ["corpus", "schema"]) {
    const d = join(learningRoot, top);
    if (existsSync(d)) removeEmptyNestedDirs(d, protectedAbs);
  }
  for (const slot of ["corpus", "DL"]) {
    const d = join(learningRoot, slot);
    if (!existsSync(d)) mkdirSync(d, { recursive: true });
    const gitkeep = join(d, ".gitkeep");
    if (!existsSync(gitkeep)) writeFileSync(gitkeep, "", "utf8");
  }
}

process.stdout.write(
  `[learning-forget-presets] ${dryRun ? "dry-run" : "done"}: ${removed} file(s) ${dryRun ? "would be " : ""}removed (DL/ untouched)\n`,
);
process.stdout.write(
  "[learning-forget-presets] DL/ = pending downloads — never deleted by this tool; clear it manually when switching packs\n",
);
