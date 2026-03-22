#!/usr/bin/env node
/**
 * First time sending this project to GitHub — one command after you create an empty repo.
 *
 * 1. In browser: https://github.com/new  → create repo (empty, no README if you already have code).
 * 2. Copy the URL GitHub shows (HTTPS or SSH).
 * 3. From monorepo root:
 *      pnpm github:first-push -- "https://github.com/YOU/REPO.git"
 *    or:
 *      node scripts/github-first-push.mjs "git@github.com:YOU/REPO.git"
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

function gitOut(cwd, args) {
  const r = spawnSync("git", args, { cwd, encoding: "utf8" });
  return r.status === 0 ? (r.stdout ?? "").trim() : null;
}

const url = process.argv.slice(2).join(" ").trim().replace(/^["']|["']$/g, "");
const here = dirname(fileURLToPath(import.meta.url));
const root = findMonorepoRoot(here) ?? findMonorepoRoot(process.cwd());

if (!root) {
  console.error("Could not find monorepo root (folder with apps/ + packages/).\n");
  process.exit(1);
}

if (!url) {
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║  Push Alchemist to GitHub — you only need to do this once       ║
╚══════════════════════════════════════════════════════════════════╝

  A) Open:  https://github.com/new
     Create a new repository (any name you like). Do NOT add a README
     if GitHub asks — you already have code here.

  B) Copy the URL GitHub shows, e.g.:
        https://github.com/yourname/your-repo.git
     or (if you use SSH keys):
        git@github.com:yourname/your-repo.git

  C) Run this from your project root (the folder that has apps/ and packages/):

        pnpm github:first-push -- "PASTE_YOUR_URL_HERE"

  After that, use:  pnpm save -- "what you changed"
  …and it will push automatically.

`);
  process.exit(1);
}

const looksOk =
  /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+(?:\.git)?\/?$/i.test(url) ||
  /^git@github\.com:[\w.-]+\/[\w.-]+(?:\.git)?$/i.test(url);
if (!looksOk) {
  console.error(
    "That does not look like a github.com repo URL.\n" +
      "Expected something like:\n" +
      "  https://github.com/you/repo.git\n" +
      "  git@github.com:you/repo.git\n"
  );
  process.exit(1);
}

const existing = gitOut(root, ["remote", "get-url", "origin"]);
if (existing) {
  console.log(`origin is already set to:\n  ${existing}\n`);
  if (existing === url || existing.replace(/\.git$/, "") === url.replace(/\.git$/, "")) {
    console.log("Same URL — pushing …\n");
    const branch = gitOut(root, ["rev-parse", "--abbrev-ref", "HEAD"]) || "main";
    runGit(root, ["push", "-u", "origin", branch]);
    process.exit(0);
  }
  console.error(
    "To replace it with your new URL, run:\n\n" +
      `  git remote set-url origin ${url}\n` +
      "  git push -u origin main\n\n" +
      "(Use your real branch name if it is not main.)\n"
  );
  process.exit(1);
}

console.log("\nAdding remote `origin` and pushing …\n");
const add = runGit(root, ["remote", "add", "origin", url]);
if (add.status !== 0) {
  process.exit(add.status ?? 1);
}

const branch = gitOut(root, ["rev-parse", "--abbrev-ref", "HEAD"]) || "main";
const push = runGit(root, ["push", "-u", "origin", branch]);
if (push.status !== 0) {
  console.error(`
If push failed, common fixes:
  • HTTPS: GitHub may ask for login — use a Personal Access Token as the password.
  • SSH: run  ssh -T git@github.com  — if that fails, add your SSH key in GitHub settings.
  • Wrong branch:  git branch   then  git push -u origin YOUR_BRANCH
`);
  process.exit(push.status ?? 1);
}

console.log("\nDone. Next time:  pnpm save -- \"your message\"\n");
