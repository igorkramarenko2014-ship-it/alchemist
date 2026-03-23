#!/usr/bin/env node
/**
 * One command: free TCP port (default 3000), then start Alchemist web dev on that port.
 * Fixes the usual “something on 3000 returns 500 / wrong app” loop without manual lsof+kill.
 *
 * Usage (monorepo root):
 *   pnpm dev:3000
 *   pnpm fresh:3000          # also deletes apps/web-app/.next first
 *   node scripts/dev-alchemist-port.mjs 3001 --fresh
 *
 * macOS/Linux: uses `lsof` to find listeners. Windows: skips kill (set PORT free yourself).
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

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

function listenPids(port) {
  const r = spawnSync("lsof", ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN", "-t"], {
    encoding: "utf8",
  });
  if (r.error?.code === "ENOENT") return null;
  if (r.status !== 0 || !r.stdout.trim()) return [];
  const set = new Set(
    r.stdout
      .trim()
      .split(/\n/)
      .map((s) => s.trim())
      .filter(Boolean)
  );
  return [...set];
}

async function freePort(port) {
  const first = listenPids(port);
  if (first === null) {
    console.warn(
      "dev-alchemist-port: `lsof` not found — cannot auto-free port. On Windows, free the port manually.\n"
    );
    return;
  }
  if (first.length === 0) {
    console.log(`dev-alchemist-port: :${port} is already free.\n`);
    return;
  }
  for (const pid of first) {
    console.log(`dev-alchemist-port: sending SIGTERM to PID ${pid} (was listening on :${port})`);
    spawnSync("kill", ["-TERM", pid]);
  }
  await delay(600);
  let stubborn = listenPids(port) ?? [];
  if (stubborn.length === 0) return;
  for (const pid of stubborn) {
    console.warn(`dev-alchemist-port: PID ${pid} still on :${port} — SIGKILL`);
    spawnSync("kill", ["-9", pid]);
  }
  await delay(400);
  stubborn = listenPids(port) ?? [];
  if (stubborn.length > 0) {
    console.error(
      `dev-alchemist-port: could not free :${port} (PIDs: ${stubborn.join(", ")}). Quit those processes manually.\n`
    );
    process.exit(1);
  }
}

function parseArgs(argv) {
  let fresh = false;
  let port = 3000;
  for (const a of argv) {
    if (a === "--fresh") fresh = true;
    else if (/^\d+$/.test(a)) port = parseInt(a, 10);
  }
  if (!Number.isFinite(port) || port < 1 || port > 65535) {
    console.error("dev-alchemist-port: bad port\n");
    process.exit(1);
  }
  return { port, fresh };
}

const here = dirname(fileURLToPath(import.meta.url));
const root = findMonorepoRoot(here) ?? findMonorepoRoot(process.cwd());
if (!root) {
  console.error(
    "dev-alchemist-port: monorepo root not found (need package.json name \"alchemist\" + workspaces).\n"
  );
  process.exit(1);
}

const { port, fresh } = parseArgs(process.argv.slice(2));
const webNext = join(root, "apps", "web-app", ".next");

if (fresh) {
  try {
    rmSync(webNext, { recursive: true, force: true });
    console.log("dev-alchemist-port: removed apps/web-app/.next (--fresh)\n");
  } catch (e) {
    console.warn("dev-alchemist-port: could not remove .next:", (e && e.message) || e, "\n");
  }
}

await freePort(port);

const withPnpm = join(root, "scripts", "with-pnpm.mjs");
const child = spawn(process.execPath, [withPnpm, "--filter", "@alchemist/web-app", "dev"], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, PORT: String(port), ALCHEMIST_PNPM_FALLBACK_QUIET: "1" },
});

child.on("error", (err) => {
  console.error("dev-alchemist-port: spawn failed:", err?.message ?? err);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
