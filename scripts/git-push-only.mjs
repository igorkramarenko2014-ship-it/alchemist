#!/usr/bin/env node
/**
 * `git push` only — no new commit. Pair with `pnpm cmt` or after local commits.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
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

function runGit(cwd, args) {
  return spawnSync("git", args, { cwd, stdio: "inherit", encoding: "utf8" });
}

function getOriginUrl(cwd) {
  const r = spawnSync("git", ["remote", "get-url", "origin"], { cwd, encoding: "utf8" });
  if (r.status !== 0) return null;
  return (r.stdout ?? "").trim() || null;
}

const here = dirname(fileURLToPath(import.meta.url));
const root = findMonorepoRoot(here) ?? findMonorepoRoot(process.cwd());
if (!root) {
  console.error("git-push-only: monorepo root not found.\n");
  process.exit(1);
}

if (!getOriginUrl(root)) {
  console.error("No remote `origin`. See: pnpm github:first-push\n");
  process.exit(1);
}

const p = runGit(root, ["push", "-u", "origin", "HEAD"]);
process.exit(p.status ?? 0);
