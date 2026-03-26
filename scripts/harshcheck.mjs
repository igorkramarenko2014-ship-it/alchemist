#!/usr/bin/env node
/**
 * Local `harshcheck`: same as verify:web, but git-diff–aware Vitest when not in CI.
 * Sets `ALCHEMIST_SELECTIVE_VERIFY=1` so `run-verify-with-summary.mjs` skips full
 * `test:engine` for unchanged packages (vs `git merge-base HEAD origin/main`).
 * When `shared-engine` sources change, IOM power-cell hints may run a **subset** of Vitest
 * files (fallback: full engine suite). CI always runs the full suite (`ALCHEMIST_SELECTIVE_VERIFY`
 * ignored when `CI` is set).
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
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

const here = dirname(fileURLToPath(import.meta.url));
const root = findMonorepoRoot(here) ?? findMonorepoRoot(process.cwd());
if (!root) {
  process.stderr.write("[alchemist] harshcheck: monorepo root not found\n");
  process.exit(1);
}

const env = { ...process.env, ALCHEMIST_PNPM_FALLBACK_QUIET: "1" };
if (!process.env.CI) {
  env.ALCHEMIST_SELECTIVE_VERIFY = "1";
}

/**
 * Fresh web-state rule for local harshcheck:
 * clear stale Next/Turbo caches before verify-web so results are not polluted by old server/build artifacts.
 * Disable only when explicitly requested.
 */
const freshWebEnabled =
  !process.env.CI && process.env.ALCHEMIST_HARSHCHECK_SKIP_FRESH_WEB !== "1";
if (freshWebEnabled) {
  const nextDir = join(root, "apps", "web-app", ".next");
  const turboDir = join(root, ".turbo");
  try {
    rmSync(nextDir, { recursive: true, force: true });
    rmSync(turboDir, { recursive: true, force: true });
    process.stderr.write(
      "[alchemist] harshcheck: fresh web state reset (.next, .turbo) before verify-web\n",
    );
  } catch (e) {
    process.stderr.write(
      `[alchemist] harshcheck: fresh web reset failed (${String(e)}) — continuing verify-web\n`,
    );
  }
}

const withPnpm = join(root, "scripts", "with-pnpm.mjs");
const r = spawnSync(process.execPath, [withPnpm, "verify:web"], {
  cwd: root,
  stdio: "inherit",
  env,
  shell: false,
});
process.exit(r.status === null ? 1 : r.status);
