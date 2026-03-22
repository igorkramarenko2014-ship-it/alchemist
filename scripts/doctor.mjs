#!/usr/bin/env node
/**
 * Quick diagnostics when `pnpm dev` fails. Run from repo root OR any subfolder:
 *   node scripts/doctor.mjs
 *   pnpm alc:doctor
 *   (Do not use `pnpm doctor` — that is pnpm's built-in, not this script.)
 */
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
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

const here = dirname(fileURLToPath(import.meta.url));
const root = findMonorepoRoot(here) ?? findMonorepoRoot(process.cwd());

console.log("\n=== Alchemist doctor ===\n");

if (!root) {
  console.error(
    "FAIL: Could not find monorepo root (package.json with name \"alchemist\" + workspaces).\n" +
      "  cd into **Vibe Projects** (the folder that contains `apps/` and `packages/`), then:\n" +
      "    pnpm install\n" +
      "    pnpm dev\n" +
      "  If Cursor opened only `vst/`, run:  cd ..  then the same commands.\n"
  );
  process.exit(1);
}

console.log("OK  Monorepo root:", root);

const nodeMajor = Number(process.versions.node.split(".")[0]);
if (nodeMajor < 20) {
  console.error(`FAIL Node ${process.versions.node} — need >= 20 (see root package.json engines).`);
  process.exit(1);
}
console.log("OK  Node", process.versions.node);
if (nodeMajor > 22) {
  console.warn(
    "WARN Node " +
      process.versions.node +
      " — Next.js 14.x is mostly validated on Node 20–22 LTS. If `next dev` crashes or misbehaves, try Node 22 (e.g. nvm/fnm: install 22 && use 22).\n"
  );
}

const webPkg = join(root, "apps", "web-app", "package.json");
if (!existsSync(webPkg)) {
  console.error("FAIL Missing apps/web-app/package.json");
  process.exit(1);
}

const nextPathApp = join(root, "apps", "web-app", "node_modules", "next");
const nextPathRoot = join(root, "node_modules", "next");
if (!existsSync(nextPathApp) && !existsSync(nextPathRoot)) {
  console.error(
    "FAIL Next.js not found under apps/web-app/node_modules or repo node_modules.\n" +
      "  From repo root run:\n" +
      "    node scripts/with-pnpm.mjs install\n" +
      "  (or `pnpm install` if pnpm is on PATH / Corepack enabled.)\n" +
      "  Do not use `npm install` only inside apps/web-app without the workspace root.\n"
  );
  process.exit(1);
}

let nextBin = null;
for (const pkgJson of [webPkg, join(root, "package.json")]) {
  if (!existsSync(pkgJson)) continue;
  try {
    const require = createRequire(pkgJson);
    nextBin = require.resolve("next/dist/bin/next");
    break;
  } catch {
    /* try other root */
  }
}
if (!nextBin) {
  console.error("FAIL Could not resolve next/dist/bin/next — run `node scripts/with-pnpm.mjs install` at repo root.");
  process.exit(1);
}
console.log("OK  Next.js resolves:", nextBin);

const requireWeb = createRequire(webPkg);
for (const pkg of ["@alchemist/shared-engine", "@alchemist/shared-types", "@alchemist/shared-ui"]) {
  try {
    requireWeb.resolve(pkg);
    console.log("OK  Workspace resolves:", pkg);
  } catch {
    console.error(
      `FAIL ${pkg} not resolvable from apps/web-app (broken or missing install).\n` +
        "  From repo root run:\n" +
        "    node scripts/with-pnpm.mjs install\n" +
        "  Always install from the **monorepo root** — not only inside apps/web-app.\n"
    );
    process.exit(1);
  }
}

console.log(
  "\nTry:\n  cd \"" +
    root +
    "\"\n  node scripts/with-pnpm.mjs dev\n  # or: pnpm dev  (if pnpm is on PATH)\n" +
    "  From **vst/** without pnpm:  npm run dev   (forwards to root + npx pnpm)\n" +
    "  Dev server binds 0.0.0.0 by default (localhost + 127.0.0.1). Loopback-only: HOST=127.0.0.1 pnpm dev\n"
);
console.log("Optional Turbo-wrapped web dev:\n  pnpm dev:turbo\n");
console.log(
  "Dev file watchers (EMFILE):\n" +
    "  dev-server sets WATCHPACK_POLLING=true when unset; next.config uses webpack polling.\n" +
    "  Still failing: ulimit -n 65536  ·  opt out of polling: WATCHPACK_POLLING=0 pnpm dev\n" +
    "  See RUN.txt\n"
);
console.log("Webpack/swc dev cache only (keeps .next, faster than full clean):\n  node scripts/recover-web-dev.mjs\n  pnpm dev:recover\n");
console.log("Full fresh Next + turbo stop:\n  pnpm web:dev:fresh\n");
console.log("Engine perf sweep (logged JSON, FIRE-compliant):\n  pnpm perf:boss\n");
console.log("(Command is `pnpm alc:doctor` — `pnpm doctor` is pnpm's built-in.)\n");
console.log("");
