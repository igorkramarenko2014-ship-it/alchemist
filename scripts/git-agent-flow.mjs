#!/usr/bin/env node
/**
 * Cursor-style two-step flow: (1) log + status, (2) git-save (add / commit / push).
 * Matches the "Thought → Git log and status check" / "Thought → Git save" UX in chat.
 *
 * Usage (repo root):
 *   node scripts/git-agent-flow.mjs "chore: your message"
 *   pnpm git:agent -- "chore: your message"
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
  console.error("git-agent-flow: monorepo root not found.\n");
  process.exit(1);
}

const msgArgs = process.argv.slice(2).filter((a) => a !== "--");
const saveScript = join(root, "scripts", "git-save.mjs");

function thought(title) {
  console.log("\n── Thought: " + title + " ──\n");
}

thought("Git log and status check");
runGit(root, ["log", "-1", "--oneline"]);
runGit(root, ["status", "-sb"]);

thought("Git save and status check");
const r = spawnSync(process.execPath, [saveScript, ...msgArgs], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env },
});
if ((r.status ?? 1) !== 0) {
  process.exit(r.status ?? 1);
}

thought("Git status after save");
runGit(root, ["status", "-sb"]);
console.log("\n── Completed ──\n");
