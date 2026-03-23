#!/usr/bin/env node
/**
 * Stage everything and commit — no push. Use `pnpm psh` after, or `pnpm git:agent` for both.
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

const here = dirname(fileURLToPath(import.meta.url));
const root = findMonorepoRoot(here) ?? findMonorepoRoot(process.cwd());
if (!root) {
  console.error("git-commit-only: monorepo root not found.\n");
  process.exit(1);
}

const msg =
  process.argv.slice(2).filter((a) => a !== "--").join(" ").trim() ||
  `checkpoint: ${new Date().toISOString().replace(/T/, " ").slice(0, 19)}`;

runGit(root, ["add", "-A"]);
const names = spawnSync("git", ["diff", "--cached", "--name-only"], {
  cwd: root,
  encoding: "utf8",
});
const staged = (names.stdout ?? "").trim();
if (!staged) {
  console.log("Nothing to commit.\n");
  process.exit(0);
}

const risky = staged.split("\n").filter((f) => /\.env/i.test(f) && !f.endsWith(".example"));
if (risky.length > 0) {
  console.error("Refusing commit: env-like files staged — unstage or use a safer path:\n", risky.join("\n"));
  process.exit(1);
}

const c = runGit(root, ["commit", "-m", msg]);
process.exit(c.status ?? 0);
