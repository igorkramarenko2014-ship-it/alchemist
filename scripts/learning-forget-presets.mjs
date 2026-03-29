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
 *   LEARNING_FORGET_SKIP_CORPUS_STRICT=1 — skip the corpus allowlist pass (debug only)
 *
 * Pass 2 (corpus): deletes ANY file under learning/corpus/ that is not a lesson JSON, optional
 * human .md note, or .gitkeep — removes vendor pack trees, instructions, .nfo, .rtf, fonts, etc.
 * DL/ is still never touched.
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
  /** Torrent / pack-release metadata (not lesson content). */
  ".nfo",
  /** Other synth / DAW preset blobs often dropped by mistake (corpus strict also removes unknown ext). */
  ".vital",
  ".webloc",
  ".sfz",
  ".sf2",
  ".adg",
  ".h2p",
  ".fxb2",
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

/** Allowed file names under corpus/ after squeeze (logic + optional human notes only). */
function isCorpusAllowedFile(filePath) {
  const base = basename(filePath);
  if (base === ".gitkeep" || base === ".gitignore") return true;
  const ext = extname(filePath).toLowerCase();
  if (ext === ".json" || ext === ".md") return true;
  return false;
}

/** Collect files under corpus/ that are not lesson JSON, optional .md, or .gitkeep. */
function collectCorpusNonLessonFiles(corpusRoot, learningRoot, out = []) {
  if (!existsSync(corpusRoot)) return out;
  for (const ent of readdirSync(corpusRoot, { withFileTypes: true })) {
    const p = join(corpusRoot, ent.name);
    if (ent.isDirectory()) {
      collectCorpusNonLessonFiles(p, learningRoot, out);
    } else if (!isUnderPendingDownloads(p, learningRoot) && !isCorpusAllowedFile(p)) {
      out.push(p);
    }
  }
  return out;
}

/**
 * Remove vendor/pack debris under corpus/ (only *.json + *.md + .gitkeep survive).
 * Prunes empty folders under corpus/ afterward.
 */
function strictCorpusSanitize(corpusRoot, learningRoot) {
  const bad = collectCorpusNonLessonFiles(corpusRoot, learningRoot, []);
  for (const p of bad) {
    try {
      unlinkSync(p);
    } catch (e) {
      process.stderr.write(`[learning-forget-presets] corpus strict: failed ${p} ${e?.message ?? e}\n`);
      process.exit(1);
    }
  }
  const protectedAbs = new Set([corpusRoot, learningRoot, pendingDownloadsRoot(learningRoot)]);
  removeEmptyNestedDirs(corpusRoot, protectedAbs);
  return bad.length;
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
const skipCorpusStrict = process.env.LEARNING_FORGET_SKIP_CORPUS_STRICT === "1";
const corpusRoot = join(learningRoot, "corpus");

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

const corpusStrictTargets = skipCorpusStrict ? [] : collectCorpusNonLessonFiles(corpusRoot, learningRoot, []);

let removedPass1 = 0;
let removedPass2 = 0;

if (dryRun) {
  removedPass1 = toDelete.length;
  process.stdout.write(`[dry-run] pass 1 (extensions/noise): would delete ${removedPass1} file(s) under learning/ (DL/ excluded)\n`);
  const preview = toDelete.slice(0, 5);
  for (const p of preview) process.stdout.write(`  - ${p}\n`);
  if (removedPass1 > preview.length) process.stdout.write(`  … and ${removedPass1 - preview.length} more\n`);
  if (!skipCorpusStrict) {
    process.stdout.write(
      `[dry-run] pass 2 (corpus strict): would delete ${corpusStrictTargets.length} file(s) not *.json / *.md / .gitkeep under corpus/\n`,
    );
    const prev2 = corpusStrictTargets.slice(0, 8);
    for (const p of prev2) process.stdout.write(`  - ${p}\n`);
    if (corpusStrictTargets.length > prev2.length) {
      process.stdout.write(`  … and ${corpusStrictTargets.length - prev2.length} more\n`);
    }
  } else {
    process.stdout.write("[dry-run] LEARNING_FORGET_SKIP_CORPUS_STRICT=1 — pass 2 skipped\n");
  }
} else {
  for (const p of toDelete) {
    try {
      unlinkSync(p);
      removedPass1 += 1;
    } catch (e) {
      process.stderr.write(`[learning-forget-presets] failed: ${p} ${e?.message ?? e}\n`);
      process.exit(1);
    }
  }
  if (!skipCorpusStrict) {
    removedPass2 = strictCorpusSanitize(corpusRoot, learningRoot);
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

const uniqueDryRun = dryRun
  ? skipCorpusStrict
    ? removedPass1
    : new Set([...toDelete, ...corpusStrictTargets]).size
  : 0;
const total = dryRun ? uniqueDryRun : removedPass1 + removedPass2;
process.stdout.write(
  `[learning-forget-presets] ${dryRun ? "dry-run" : "done"}: ${dryRun ? "would remove " : ""}${total} unique file(s) ${dryRun ? "" : "total "}(pass1: ${dryRun ? removedPass1 : removedPass1}, corpus strict: ${dryRun ? corpusStrictTargets.length : removedPass2}; DL/ untouched${dryRun ? "; overlap deduped in total" : ""})\n`,
);
if (!skipCorpusStrict) {
  process.stdout.write(
    "[learning-forget-presets] corpus strict: only *.json lesson files, optional *.md notes, and .gitkeep may remain under corpus/\n",
  );
}
process.stdout.write(
  "[learning-forget-presets] DL/ = pending downloads — never deleted by this tool; clear it manually when switching packs\n",
);
