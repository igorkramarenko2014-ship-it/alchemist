#!/usr/bin/env node
/**
 * Local `harshcheck`: same as verify:web, but git-diff–aware Vitest when not in CI.
 * Sets `ALCHEMIST_SELECTIVE_VERIFY=1` so `run-verify-with-summary.mjs` skips full
 * `test:engine` for unchanged packages (vs `git merge-base HEAD origin/main`).
 * When `shared-engine` sources change, IOM power-cell hints may run a **subset** of Vitest
 * files (fallback: full engine suite). CI always runs the full suite (`ALCHEMIST_SELECTIVE_VERIFY`
 * ignored when `CI` is set).
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";

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
const verifyCode = r.status === null ? 1 : r.status;
if (verifyCode !== 0) {
  process.exit(verifyCode);
}

/** Auto-start ephemeral web server for runtime truth checks (can disable with ALCHEMIST_HARSHCHECK_AUTO_SERVER=0). */
const autoServer = process.env.ALCHEMIST_HARSHCHECK_AUTO_SERVER !== "0";
if (!autoServer) {
  process.exit(0);
}

const runtimePort = Number.parseInt(process.env.ALCHEMIST_HARSHCHECK_SERVER_PORT ?? "3100", 10);
const runtimeHost = process.env.ALCHEMIST_HARSHCHECK_SERVER_HOST ?? "127.0.0.1";
const baseUrl = `http://${runtimeHost}:${runtimePort}`;
const server = spawn(
  process.execPath,
  [
    withPnpm,
    "--filter",
    "@alchemist/web-app",
    "start",
    "--hostname",
    runtimeHost,
    "--port",
    String(runtimePort),
  ],
  {
    cwd: root,
    stdio: "inherit",
    env: {
      ...env,
      NODE_ENV: "production",
    },
    shell: false,
  },
);

async function waitForHealth(url, timeoutMs = 45_000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try {
      const r = await fetch(`${url}/api/health`, { method: "GET" });
      if (r.ok) return true;
    } catch {
      // keep polling
    }
    await sleep(800);
  }
  return false;
}

const healthy = await waitForHealth(baseUrl);
if (!healthy) {
  process.stderr.write(
    `[alchemist] harshcheck: timed out waiting for ${baseUrl}/api/health (runtime truth checks skipped)\n`,
  );
  server.kill("SIGTERM");
  process.exit(1);
}

const truth = spawnSync(process.execPath, [withPnpm, "check:truth"], {
  cwd: root,
  stdio: "inherit",
  env: {
    ...env,
    ALCHEMIST_TRUTH_MATRIX_URL: `${baseUrl}/api/health/truth-matrix`,
  },
  shell: false,
});
server.kill("SIGTERM");
process.exit(truth.status === null ? 1 : truth.status);
