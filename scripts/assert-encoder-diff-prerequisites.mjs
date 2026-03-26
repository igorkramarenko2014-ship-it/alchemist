#!/usr/bin/env node
/**
 * CI / opt-in: if the git range touches encoder offset sources, require **tools/sample_init.fxp**
 * on disk so **`validate-offsets.py`** can run — closes the “offset map changed but never validated” hole
 * when **`ALCHEMIST_STRICT_OFFSETS`** is not set (e.g. **develop** PRs).
 *
 * Env:
 * - **GITHUB_ACTIONS** — when **true**, fail closed if sample missing and encoder paths changed.
 * - **ALCHEMIST_ENCODER_DIFF_REQUIRES_SAMPLE=1** — same behavior locally / other CI.
 */
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

function findMonorepoRoot(startDir) {
  let dir = startDir;
  for (let i = 0; i < 16; i++) {
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

function changedPaths(root) {
  const mb = spawnSync("git", ["merge-base", "HEAD", "origin/main"], { cwd: root, encoding: "utf8" });
  let base = null;
  if (mb.status === 0 && mb.stdout.trim()) base = mb.stdout.trim();
  if (!base) {
    const prev = spawnSync("git", ["rev-parse", "HEAD~1"], { cwd: root, encoding: "utf8" });
    if (prev.status !== 0 || !prev.stdout.trim()) return [];
    base = prev.stdout.trim();
  }
  const d = spawnSync("git", ["diff", "--name-only", `${base}...HEAD`], {
    cwd: root,
    encoding: "utf8",
  });
  if (d.status !== 0) return [];
  return d.stdout.split(/\r?\n/).filter(Boolean);
}

function touchesEncoderValidation(file) {
  const p = file.replace(/\\/g, "/");
  return (
    p.endsWith("/serum-offset-map.ts") ||
    p.endsWith("serum-offset-map.ts") ||
    p.endsWith("/validate-offsets.py") ||
    p === "tools/validate-offsets.py"
  );
}

const here = dirname(fileURLToPath(import.meta.url));
const root = findMonorepoRoot(here) ?? findMonorepoRoot(process.cwd());
if (!root) {
  process.stderr.write("[encoder-diff-prereq] monorepo root not found\n");
  process.exit(1);
}

const changed = changedPaths(root);
const encoderTouched = changed.filter(touchesEncoderValidation);

if (encoderTouched.length === 0) {
  process.stderr.write("[encoder-diff-prereq] no serum-offset-map / validate-offsets.py changes in range — OK\n");
  process.exit(0);
}

const sample = join(root, "tools", "sample_init.fxp");
if (existsSync(sample)) {
  process.stderr.write("[encoder-diff-prereq] sample_init.fxp present — OK\n");
  process.exit(0);
}

const strictEnv =
  process.env.GITHUB_ACTIONS === "true" || process.env.ALCHEMIST_ENCODER_DIFF_REQUIRES_SAMPLE === "1";

if (!strictEnv) {
  process.stderr.write(
    `[encoder-diff-prereq] warn: encoder files changed (${encoderTouched.length}) but tools/sample_init.fxp missing — set ALCHEMIST_ENCODER_DIFF_REQUIRES_SAMPLE=1 or run in GitHub Actions to fail closed\n`,
  );
  for (const t of encoderTouched.slice(0, 12)) process.stderr.write(`  - ${t}\n`);
  process.exit(0);
}

process.stderr.write(
  "[encoder-diff-prereq] FAIL: serum-offset-map and/or validate-offsets.py changed but tools/sample_init.fxp is missing.\n" +
    "Provision a real Serum init .fxp in CI (e.g. encrypted secret → checkout) or commit for private forks.\n",
);
for (const t of encoderTouched) process.stderr.write(`  - ${t}\n`);
process.exit(1);
