#!/usr/bin/env node
/**
 * Dev watchdog: keeps web-app server alive on a fixed port.
 * Default **`pnpm dev`** uses **`dev-alchemist-port.mjs`** only (no health restarts). Opt-in: **`pnpm dev:guardian`**.
 *
 * Strategy:
 * 1) Start via scripts/dev-alchemist-port.mjs (kills wrong listeners + boots correct app).
 * 2) Poll /api/health every few seconds (after boot grace — see ALCHEMIST_DEV_GUARDIAN_GRACE_MS).
 * 3) If health fails repeatedly or child exits, auto-restart.
 * 4) Escalate to --fresh after repeated restart loops.
 */
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

function parseArgs(argv) {
  let port = 3000;
  let fresh = false;
  for (const arg of argv) {
    if (arg === "--fresh") fresh = true;
    else if (/^\d+$/.test(arg)) port = Number.parseInt(arg, 10);
    else if (arg === "-h" || arg === "--help") {
      process.stdout.write(
        "Usage: node scripts/dev-guardian.mjs [port] [--fresh]\n" +
          "  port   preferred dev port (default 3000)\n" +
          "  --fresh remove apps/web-app/.next on first boot\n",
      );
      process.exit(0);
    }
  }
  if (!Number.isFinite(port) || port < 1 || port > 65535) {
    process.stderr.write("[dev-guardian] invalid port\n");
    process.exit(1);
  }
  return { port, fresh };
}

const { port, fresh } = parseArgs(process.argv.slice(2));
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const runner = join(root, "scripts", "dev-alchemist-port.mjs");
const healthApiUrl = `http://127.0.0.1:${port}/api/health`;
const healthPageUrl = `http://127.0.0.1:${port}/`;

/** While Next is cold-compiling, /api/health is unreachable — old logic treated that as "unhealthy" and SIGKILL'd the child after ~7.5s (ERR_CONNECTION_REFUSED loop for the operator). */
const bootGraceMs = (() => {
  const raw = process.env.ALCHEMIST_DEV_GUARDIAN_GRACE_MS;
  if (raw === undefined || raw === "") return 180_000;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : 180_000;
})();

let child = null;
let shuttingDown = false;
let restartCount = 0;
let unhealthyStreak = 0;
let lastStartAt = 0;

function nowIso() {
  return new Date().toISOString();
}

function spawnDev({ freshBoot }) {
  const args = [runner, String(port)];
  if (freshBoot) args.push("--fresh");
  lastStartAt = Date.now();
  process.stderr.write(
    `[dev-guardian] ${nowIso()} starting dev server on :${port}${freshBoot ? " (fresh)" : ""}` +
      (bootGraceMs > 0
        ? ` — health-based restarts paused for ${Math.round(bootGraceMs / 1000)}s (compile / cold start)\n`
        : "\n"),
  );
  child = spawn(process.execPath, args, {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, ALCHEMIST_PNPM_FALLBACK_QUIET: "1" },
    shell: false,
  });

  child.on("exit", (code, signal) => {
    if (shuttingDown) return;
    const uptimeMs = Date.now() - lastStartAt;
    restartCount += 1;
    process.stderr.write(
      `[dev-guardian] ${nowIso()} dev exited (code=${String(code)} signal=${String(signal)} uptime=${uptimeMs}ms) -> restart #${restartCount}\n`,
    );
  });
}

function terminateChild() {
  if (!child || child.killed) return;
  try {
    child.kill("SIGTERM");
  } catch {
    // ignore
  }
}

async function restartDev({ forceFresh }) {
  terminateChild();
  await sleep(700);
  if (child && child.exitCode === null) {
    try {
      child.kill("SIGKILL");
    } catch {
      // ignore
    }
    await sleep(250);
  }
  spawnDev({ freshBoot: forceFresh });
}

async function probeHealth() {
  try {
    const apiResponse = await fetch(healthApiUrl, {
      method: "GET",
      signal: AbortSignal.timeout(8000),
    });
    if (!apiResponse.ok) return false;
    const payload = await apiResponse.json().catch(() => null);
    if (!payload || typeof payload !== "object") return false;
    if ("ok" in payload && payload.ok !== true) return false;

    // Catch "server up but page broken" regressions (white page / routing failures).
    const pageResponse = await fetch(healthPageUrl, {
      method: "GET",
      signal: AbortSignal.timeout(8000),
    });
    return pageResponse.ok;
  } catch {
    return false;
  }
}

async function runWatchLoop() {
  // First boot can be fresh by explicit user request.
  spawnDev({ freshBoot: fresh });

  while (!shuttingDown) {
    await sleep(2500);
    if (shuttingDown) break;

    // If process crashed, restart (fresh after multiple loops).
    if (!child || child.exitCode !== null) {
      const forceFresh = restartCount >= 2;
      await restartDev({ forceFresh });
      unhealthyStreak = 0;
      continue;
    }

    const ok = await probeHealth();
    if (ok) {
      unhealthyStreak = 0;
      continue;
    }

    const compiling =
      bootGraceMs > 0 && Date.now() - lastStartAt < bootGraceMs && child && child.exitCode === null;
    if (compiling) {
      unhealthyStreak = 0;
      continue;
    }

    unhealthyStreak += 1;
    if (unhealthyStreak < 3) continue;

    restartCount += 1;
    const forceFresh = restartCount >= 2;
    process.stderr.write(
      `[dev-guardian] ${nowIso()} health probe failed ${unhealthyStreak} times -> restart #${restartCount}${forceFresh ? " (fresh)" : ""}\n`,
    );
    unhealthyStreak = 0;
    await restartDev({ forceFresh });
  }
}

for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    shuttingDown = true;
    terminateChild();
    process.exit(0);
  });
}

await runWatchLoop();
