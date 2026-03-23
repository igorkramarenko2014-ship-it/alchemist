#!/usr/bin/env node
/**
 * One-step: stage (git add -A), commit, push — so you do not lose work.
 *
 * Usage (from monorepo root):
 *   node scripts/git-save.mjs "your message"
 *   pnpm git:save -- "your message"
 *
 * If there is nothing to commit, still attempts `git push` (sync with GitHub).
 * If `origin` is missing, prints one-time setup commands.
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
  const r = spawnSync("git", ["remote", "get-url", "origin"], {
    cwd,
    encoding: "utf8",
  });
  if (r.status !== 0) return null;
  return (r.stdout ?? "").trim() || null;
}

const here = dirname(fileURLToPath(import.meta.url));
const root = findMonorepoRoot(here) ?? findMonorepoRoot(process.cwd());

if (!root) {
  console.error(
    "git-save: could not find monorepo root (package.json name \"alchemist\" + workspaces).\n" +
      "  cd to the folder that contains apps/ and packages/, then run again.\n"
  );
  process.exit(1);
}

/** pnpm may pass a lone `--` before the message; strip those tokens. */
function messageFromArgv() {
  return process.argv.slice(2).filter((a) => a !== "--").join(" ").trim();
}

const msg =
  messageFromArgv() ||
  `checkpoint: ${new Date().toISOString().replace(/T/, " ").slice(0, 19)}`;

console.log("\n=== git-save ===\nRoot:", root, "\n");

runGit(root, ["add", "-A"]);

const names = spawnSync("git", ["diff", "--cached", "--name-only"], {
  cwd: root,
  encoding: "utf8",
});
const staged = (names.stdout ?? "").trim();

if (!staged) {
  console.log("Nothing new to commit (working tree clean after add).\n");
} else {
  console.log("Staged:\n" + staged.split("\n").slice(0, 40).map((l) => "  " + l).join("\n"));
  if (staged.split("\n").length > 40) console.log("  …");
  console.log("");
  const c = runGit(root, ["commit", "-m", msg]);
  if (c.status !== 0) {
    process.exit(c.status ?? 1);
  }
}

const origin = getOriginUrl(root);
if (!origin) {
  console.error(
    "No remote `origin` — commits are LOCAL only until you connect GitHub.\n\n" +
      "Easiest (create an empty repo at https://github.com/new, then):\n\n" +
      '  pnpm github:first-push -- "https://github.com/YOUR_USER/YOUR_REPO.git"\n\n' +
      "Or run `pnpm github:first-push` with no args for full steps.\n"
  );
  process.exit(staged ? 0 : 0);
}

console.log("Pushing to origin …\n");
const p = runGit(root, ["push", "-u", "origin", "HEAD"]);
process.exit(p.status ?? 0);
