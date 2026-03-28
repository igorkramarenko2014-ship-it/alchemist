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
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

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

console.log("\n=== Happy Panda (alchemist.happy_panda) ===\n");

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

const pv = spawnSync("pnpm", ["-v"], { encoding: "utf8", shell: false });
if (pv.status !== 0 || !(pv.stdout || "").trim()) {
  fail("pnpm not on PATH — corepack enable && corepack prepare pnpm@9.14.2 --activate");
} else {
  ok(`pnpm ${(pv.stdout || "").trim()}`);
}

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
console.log("Full contract: docs/critical-fix-happy-panda-autoload.md\n");
process.exit(exitCode);
