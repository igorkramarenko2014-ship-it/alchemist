#!/usr/bin/env node
/**
 * Strip common broken Next.js dev caches (webpack pack / swc) without full `pnpm clean`.
 *
 *   node scripts/recover-web-dev.mjs
 *   pnpm dev:recover   # runs this + starts dev
 */
import { existsSync, readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

function findRoot(startDir) {
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
const root = findRoot(here) ?? findRoot(process.cwd());

if (!root) {
  console.error("recover-web-dev: could not find monorepo root.");
  process.exit(1);
}

const webNext = join(root, "apps", "web-app", ".next");
const dirs = [
  join(webNext, "cache", "webpack"),
  join(webNext, "cache", "swc"),
];

let removed = 0;
for (const d of dirs) {
  if (existsSync(d)) {
    try {
      rmSync(d, { recursive: true, force: true });
      console.log("Removed:", d);
      removed++;
    } catch (e) {
      console.warn("Could not remove", d, e?.message ?? e);
    }
  }
}

if (removed === 0) {
  console.log("No webpack/swc cache dirs under apps/web-app/.next/cache (clean or never built).");
} else {
  console.log(`Cleared ${removed} cache dir(s). Next dev will cold-compile.`);
}

console.log("Next:  pnpm dev   (or  pnpm web:dev:fresh  if still broken)\n");
