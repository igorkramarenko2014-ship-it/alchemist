#!/usr/bin/env node
/**
 * Happy Panda — fast preflight gates (see docs/critical-fix-happy-panda-autoload.md).
 *
 * Runs automatically before `pnpm dev`, `web:dev:fresh`, `dev:recover`, etc. unless skipped.
 *
 *   pnpm panda
 *   pnpm panda --health 3010    # requires dev server on PORT; curl GET /api/health → 200
 *
 * Skip (CI / nested tools):  ALCHEMIST_SKIP_PANDA=1
 *
 * PNH APT victim channel (argv + NODE_OPTIONS + ALCHEMIST_*): `scripts/pnh-preflight-apt.mjs`
 * Skip PNH only: ALCHEMIST_SKIP_PNH_PREFLIGHT=1
 * Refuse dev when heuristics match: ALCHEMIST_PNH_PREFLIGHT_BLOCK=1 (alias: ALCHEMIST_PNH_STOP_AUTOATTACK=1)
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { scanHappyPandaVictimChannel } from "./pnh-preflight-apt.mjs";

function findMonorepoRoot(startDir) {
  let dir = startDir;
  for (let i = 0; i < 14; i++) {
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

if (process.env.ALCHEMIST_SKIP_PANDA === "1") {
  process.exit(0);
}

const here = dirname(fileURLToPath(import.meta.url));
const root = findMonorepoRoot(here) ?? findMonorepoRoot(process.cwd());

let exitCode = 0;
function fail(msg) {
  console.error(`FAIL  ${msg}`);
  exitCode = 1;
}
function ok(msg) {
  console.log(`OK    ${msg}`);
}
function warn(msg) {
  console.warn(`WARN  ${msg}`);
}

console.log("\n=== Happy Panda (alchemist.happy_panda) — PNH APT victim channel ===\n");

if (!root) {
  fail('Monorepo root not found (need package.json name "alchemist" + workspaces). cd to folder with apps/ + packages/.');
  process.exit(1);
}
ok(`Monorepo root: ${root}`);

if (!existsSync(join(root, "apps")) || !existsSync(join(root, "packages"))) {
  fail("Missing apps/ or packages/ — cwd gate.");
  process.exit(1);
}
ok("cwd gate: apps/ + packages/");

const nodeMajor = Number(process.versions.node.split(".")[0]);
if (nodeMajor < 20) fail(`Node ${process.versions.node} — need >= 20`);
else ok(`Node ${process.versions.node}`);

if (process.env.ALCHEMIST_SKIP_PNH_PREFLIGHT !== "1") {
  const { matches } = scanHappyPandaVictimChannel();
  const block =
    process.env.ALCHEMIST_PNH_PREFLIGHT_BLOCK === "1" ||
    process.env.ALCHEMIST_PNH_STOP_AUTOATTACK === "1";
  if (matches.length > 0) {
    const line = `PNH APT heuristic match on victim channel — scenarios: ${matches.join(", ")}`;
    if (block) {
      fail(
        `${line}  (refuse: unset ALCHEMIST_PNH_PREFLIGHT_BLOCK / ALCHEMIST_PNH_STOP_AUTOATTACK or ALCHEMIST_SKIP_PNH_PREFLIGHT=1 after review)`,
      );
      process.exit(1);
    }
    warn(
      `${line}  — triad gates unchanged; to hard-stop dev: ALCHEMIST_PNH_PREFLIGHT_BLOCK=1 pnpm dev`,
    );
  } else if (process.env.ALCHEMIST_PNH_VERBOSE === "1") {
    ok("PNH victim channel scan: no APT heuristics matched (argv / NODE_OPTIONS / ALCHEMIST_*)");
  }
}

/** Same resolution as `scripts/with-pnpm.mjs` — `pnpm` is often missing from PATH in bare shells even though dev works. */
function probePnpmVersion(repoRoot) {
  const direct = spawnSync("pnpm", ["-v"], { encoding: "utf8", shell: false });
  if (direct.status === 0 && (direct.stdout || "").trim()) {
    return { ok: true, line: `pnpm ${(direct.stdout || "").trim()} (on PATH)` };
  }
  const withPnpm = join(repoRoot, "scripts", "with-pnpm.mjs");
  const via = spawnSync(process.execPath, [withPnpm, "-v"], {
    encoding: "utf8",
    cwd: repoRoot,
    shell: false,
  });
  if (via.status === 0 && (via.stdout || "").trim()) {
    return {
      ok: true,
      line: `pnpm ${(via.stdout || "").trim()} (via scripts/with-pnpm.mjs — same as dev)`,
    };
  }
  return { ok: false };
}

const pv = probePnpmVersion(root);
if (pv.ok) ok(pv.line);
else
  fail(
    "pnpm unavailable — corepack enable && corepack prepare pnpm@9.14.2 --activate  (or: npx pnpm@9.14.2 -v)",
  );

const envLocal = join(root, "apps", "web-app", ".env.local");
if (!existsSync(envLocal)) {
  warn("No apps/web-app/.env.local — live triad often stub until keys (`pnpm env:check`).");
} else {
  ok("apps/web-app/.env.local");
}

const argv = process.argv.slice(2);
const hi = argv.indexOf("--health");
if (hi >= 0) {
  const port = argv[hi + 1] || "3010";
  const url = `http://127.0.0.1:${port}/api/health`;
  const cu = spawnSync("curl", ["-sfS", "-o", "/dev/null", "-w", "%{http_code}", url], {
    encoding: "utf8",
    shell: false,
  });
  if (cu.error?.code === "ENOENT") {
    fail("curl not found — install curl or check health in a browser");
  } else {
    const code = (cu.stdout || "").trim();
    if (code === "200") ok(`GET /api/health → 200 (${url})`);
    else fail(`GET /api/health → ${code || "error"} (${url}) — use cyan banner PORT`);
  }
}

console.log("\nNext: pnpm alc:doctor · pnpm web:next-build · pnpm fresh:3010");
console.log("Skip this preflight: ALCHEMIST_SKIP_PANDA=1 pnpm dev");
console.log("Skip PNH victim scan only: ALCHEMIST_SKIP_PNH_PREFLIGHT=1");
console.log("Full contract: docs/critical-fix-happy-panda-autoload.md\n");
process.exit(exitCode);
