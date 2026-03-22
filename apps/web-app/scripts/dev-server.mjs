#!/usr/bin/env node
/**
 * Picks a free port (3000–3060) and starts Next with an obvious URL banner.
 *
 * Env:
 * - `PORT` — preferred port (must be free on `HOST`; else we scan 3000–3060).
 * - `HOST` — bind address for Next (default `0.0.0.0` so `http://localhost:PORT` and
 *   `http://127.0.0.1:PORT` both work; some systems map `localhost` only to `::1` while
 *   a 127.0.0.1-only bind refuses the connection). Use `HOST=127.0.0.1` for loopback-only.
 * - `WATCHPACK_POLLING` — defaults to `true` when **unset** (EMFILE on macOS / WSL / big trees).
 *   To use native watchers: `WATCHPACK_POLLING=0 pnpm dev` (or export before dev).
 *
 * Preflight: verifies monorepo root (`alchemist` + workspaces). If **node_modules** is missing at
 * root but **pnpm-lock.yaml** exists, runs **`node scripts/with-pnpm.mjs install`** once (fixes “won’t run” after clone).
 */
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import { createServer } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const host = process.env.HOST?.trim() || "0.0.0.0";

const monorepoRoot = path.join(root, "..", "..");
const rootPkgPath = path.join(monorepoRoot, "package.json");
const lockPath = path.join(monorepoRoot, "pnpm-lock.yaml");
const rootNodeModules = path.join(monorepoRoot, "node_modules");

function readRootPackage() {
  try {
    return JSON.parse(fs.readFileSync(rootPkgPath, "utf8"));
  } catch {
    return null;
  }
}

const rootPkg = readRootPackage();
if (!rootPkg || rootPkg.name !== "alchemist" || !Array.isArray(rootPkg.workspaces)) {
  console.error(
    "\n✖  Could not find Alchemist monorepo root.\n" +
      "   Expected: " +
      monorepoRoot +
      "\n   (package.json with name \"alchemist\" and workspaces).\n" +
      "   Open the folder that contains **apps/** and **packages/** (e.g. Vibe Projects).\n" +
      "   If you only have **vst/**, run **pnpm dev** there — it **cd ..** to the parent repo.\n"
  );
  process.exit(1);
}

if (!fs.existsSync(rootNodeModules)) {
  if (!fs.existsSync(lockPath)) {
    console.error(
      "\n✖  Missing **node_modules** at monorepo root and no **pnpm-lock.yaml**.\n" +
        "   cd \"" +
        monorepoRoot +
        "\"\n" +
        "   node scripts/with-pnpm.mjs install\n"
    );
    process.exit(1);
  }
  console.warn(
    "\n⚠  No **node_modules** at monorepo root — running **pnpm install** once (workspace)…\n" +
      "   " +
      monorepoRoot +
      "\n"
  );
  const withPnpm = path.join(monorepoRoot, "scripts", "with-pnpm.mjs");
  const inst = spawnSync(process.execPath, [withPnpm, "install"], {
    cwd: monorepoRoot,
    stdio: "inherit",
    env: { ...process.env, ALCHEMIST_PNPM_FALLBACK_QUIET: "1" },
  });
  if (inst.status !== 0) {
    console.error(
      "\n✖  Install failed. From repo root try:\n" +
        "   node scripts/with-pnpm.mjs install\n" +
        "   node scripts/doctor.mjs\n"
    );
    process.exit(inst.status ?? 1);
  }
  if (!fs.existsSync(rootNodeModules)) {
    console.error("\n✖  Install finished but node_modules still missing — check disk space and errors above.\n");
    process.exit(1);
  }
  console.warn("✓  Workspace install done — starting Next dev\n");
}

/**
 * Probe the same host Next will use. A mismatched probe (e.g. only `::` vs `127.0.0.1`)
 * causes false "free" ports and EADDRINUSE at startup.
 */
function listenOnceOnHost(port, listenHost) {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.once("error", reject);
    server.listen(port, listenHost, () => {
      server.close(() => resolve());
    });
  });
}

/** True if nothing is listening on this port for `host`. */
async function isPortFree(port) {
  try {
    await listenOnceOnHost(port, host);
    return true;
  } catch {
    return false;
  }
}

async function findFreePort(start, end) {
  for (let p = start; p <= end; p++) {
    if (await isPortFree(p)) return p;
  }
  throw new Error(`No free port in range ${start}–${end}`);
}

async function resolvePort() {
  const envPort = process.env.PORT ? Number(process.env.PORT) : NaN;
  if (Number.isFinite(envPort) && envPort > 0) {
    if (await isPortFree(envPort)) return envPort;
    console.warn(
      `\n⚠  PORT=${envPort} is in use — picking another free port (3000–3060).\n`
    );
  }
  return findFreePort(3000, 3060);
}

/** Nuke entire `.next` before dev when set — fixes 404 on `/`, missing error components, corrupt traces. */
const nextRootDir = path.join(root, ".next");
if (process.env.ALCHEMIST_NEXT_HEAL === "1" && fs.existsSync(nextRootDir)) {
  try {
    fs.rmSync(nextRootDir, { recursive: true, force: true });
    console.warn("\nRemoved apps/web-app/.next (ALCHEMIST_NEXT_HEAL=1). First compile will be slower.\n");
  } catch (e) {
    console.warn("\nCould not remove .next:", (e && e.message) || e, "\n");
  }
}

/** Corrupted webpack pack cache sometimes breaks `next dev` (e.g. restore `hasStartTime` errors). */
const webpackCacheDir = path.join(root, ".next", "cache", "webpack");
if (process.env.ALCHEMIST_NEXT_SCRUB_WEBPACK === "1" && fs.existsSync(webpackCacheDir)) {
  try {
    fs.rmSync(webpackCacheDir, { recursive: true, force: true });
    console.warn(
      "\nRemoved apps/web-app/.next/cache/webpack (ALCHEMIST_NEXT_SCRUB_WEBPACK=1). First compile may be slower.\n"
    );
  } catch (e) {
    console.warn("\nCould not remove webpack cache:", (e && e.message) || e, "\n");
  }
}

/** Prefer `apps/web-app/node_modules`, then monorepo root (pnpm hoisting / partial installs). */
function resolveNextCli(appRoot) {
  const tryRoots = [appRoot, path.join(appRoot, "..", "..")];
  for (const tryRoot of tryRoots) {
    const pkgJson = path.join(tryRoot, "package.json");
    if (!fs.existsSync(pkgJson)) continue;
    try {
      const require = createRequire(pkgJson);
      return require.resolve("next/dist/bin/next");
    } catch {
      /* try next root */
    }
  }
  return null;
}

const nextCli = resolveNextCli(root);
if (!nextCli) {
  const monorepoHint =
    path.basename(path.dirname(root)) === "apps"
      ? "\n  This app lives in a pnpm workspace. From the **monorepo root** (folder with `apps/` + `packages/`):\n" +
        "    node scripts/with-pnpm.mjs install && node scripts/with-pnpm.mjs dev\n" +
        "  (or `pnpm install && pnpm dev` if Corepack/pnpm is on PATH.)\n" +
        "  If Cursor opened only `vst/`, run `pnpm dev` there — it forwards to the root.\n"
      : "\n";
  console.error(
    "Could not resolve Next.js." +
      monorepoHint +
      `  Tried under:\n    ${path.join(root, "node_modules", "next")}\n    and monorepo node_modules.\n`
  );
  process.exit(1);
}

const port = await resolvePort();

const cyan = "\x1b[36m";
const bold = "\x1b[1m";
const reset = "\x1b[0m";
function browserOpenUrl(listenHost, p) {
  if (listenHost === "0.0.0.0" || listenHost === "::") return `http://127.0.0.1:${p}`;
  if (listenHost.includes(":") && !listenHost.startsWith("["))
    return `http://[${listenHost}]:${p}`;
  return `http://${listenHost}:${p}`;
}
const url = browserOpenUrl(host, port);
const localhostHint =
  host === "0.0.0.0" || host === "::"
    ? `│  ${reset}Also:${reset} ${bold}http://localhost:${port}${reset}${cyan}${bold} (same server)                    │\n`
    : "";
const bindExplain =
  host === "0.0.0.0"
    ? `│  Bind 0.0.0.0 — set HOST=127.0.0.1 for loopback-only.              │\n`
    : "";

console.log(`
${cyan}${bold}┌─────────────────────────────────────────────────────────┐
│  ALCHEMIST WEB — open this URL in your browser:          │
│  ${reset}${bold}${url}${reset}${cyan}${bold}                         │
${localhostHint}${bindExplain}│  Port ${port} · scans 3000–3060 when PORT is busy.           │
│  Stuck / webpack errors?  pnpm dev:recover  ·  web:dev:fresh          │
│  404 / “error components” on /?  pnpm run clean  (repo root) → dev   │
│  Missing Next / workspace?  pnpm alc:doctor  (monorepo root)         │
└─────────────────────────────────────────────────────────┘${reset}
`);

const env = { ...process.env, PORT: String(port), HOST: host };
// Reliable dev in monorepos: native watchers often hit EMFILE (macOS / WSL / heavy trees).
// next.config.mjs also sets webpack poll. Opt out: WATCHPACK_POLLING=0 pnpm dev
if (env.WATCHPACK_POLLING === undefined) {
  env.WATCHPACK_POLLING = "true";
}

const child = spawn(
  process.execPath,
  [nextCli, "dev", "-p", String(port), "-H", host],
  {
    cwd: root,
    stdio: "inherit",
    env,
  }
);

child.on("error", (err) => {
  console.error("\n⚠  Failed to spawn Next.js:", err?.message ?? err);
  console.error(
    "  Try: pnpm install (from monorepo root)  ·  pnpm alc:doctor  ·  pnpm dev:web\n"
  );
  process.exit(1);
});

function forward(sig) {
  try {
    child.kill(sig);
  } catch {
    /* ignore */
  }
}
for (const sig of ["SIGINT", "SIGTERM"]) {
  try {
    process.on(sig, () => forward(sig));
  } catch {
    /* ignore platforms without signal */
  }
}

child.on("exit", (code, signal) => {
  if (code === 1 && !signal) {
    console.error(
      "\n⚠  Next.js exited with error. If you see EADDRINUSE, kill the old process:  lsof -i :" +
        port +
        "  (Mac/Linux)  or change PORT.\n" +
        "  Or run:  pnpm web:dev:fresh  from repo root\n"
    );
  }
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
