/**
 * Installs optional local git hooks (best-effort).
 * - Does nothing when `.git/` is absent (CI / sandbox).
 * - Copies `tools/git-hooks/pre-commit-iom.sample` → `.git/hooks/pre-commit` if missing.
 */
import { existsSync, copyFileSync, chmodSync } from "node:fs";
import { join, dirname } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

function getRepoRoot() {
  const here = dirname(fileURLToPath(import.meta.url));
  // Prefer `git rev-parse` when available.
  try {
    const r = spawnSync("git", ["rev-parse", "--show-toplevel"], {
      cwd: here,
      encoding: "utf8",
      shell: false,
    });
    if (r.status === 0 && typeof r.stdout === "string" && r.stdout.trim()) {
      return r.stdout.trim();
    }
  } catch {
    /* ignore */
  }
  // Fallback: this script lives in `scripts/` at repo root.
  return join(here, "..");
}

const repoRoot = getRepoRoot();
const gitDir = join(repoRoot, ".git");
if (!existsSync(gitDir)) {
  process.stdout.write("[hooks] no .git directory — skipping hook install\n");
  process.exit(0);
}

const dest = join(gitDir, "hooks", "pre-commit");
if (existsSync(dest)) {
  process.stdout.write("[hooks] pre-commit already exists — skipping\n");
  process.exit(0);
}

const src = join(repoRoot, "tools", "git-hooks", "pre-commit-iom.sample");
if (!existsSync(src)) {
  process.stderr.write("[hooks] pre-commit sample hook missing\n");
  process.exit(1);
}

copyFileSync(src, dest);
chmodSync(dest, 0o755);
process.stdout.write("[hooks] installed pre-commit-iom hook\n");

