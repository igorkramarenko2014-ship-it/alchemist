#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

function findMonorepoRoot(startDir) {
  let dir = startDir;
  for (let i = 0; i < 16; i += 1) {
    const packageJsonPath = join(dir, "package.json");
    if (existsSync(packageJsonPath)) {
      try {
        const pkg = JSON.parse(readFileSync(packageJsonPath, "utf8"));
        if (pkg.name === "alchemist" && Array.isArray(pkg.workspaces)) return dir;
      } catch {
        // continue
      }
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function fail(message) {
  process.stderr.write(`[assert-fire-sync-clean] ${message}\n`);
  process.exit(1);
}

function runNodeScript(root, scriptName) {
  const scriptPath = join(root, "scripts", scriptName);
  const r = spawnSync(process.execPath, [scriptPath], {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });
  if (r.status !== 0) {
    fail(`${scriptName} failed`);
  }
}

function runGitDiff(root, files) {
  const r = spawnSync("git", ["diff", "--quiet", "--", ...files], {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });
  return r.status === 0;
}

const here = dirname(fileURLToPath(import.meta.url));
const root = findMonorepoRoot(here) ?? findMonorepoRoot(process.cwd());
if (!root) fail("monorepo root not found");

const trackedFireSyncOutputs = [
  "artifacts/initiator/skills-117-manifest.json",
  "artifacts/initiator/skills-117-manifest.sha256",
  "artifacts/truth-matrix.json",
  "docs/fire-metrics.json",
  "docs/fire-metrics.sha256",
  "docs/FIRE.md",
  "docs/AIOM-Technical-Brief.md",
];

runNodeScript(root, "sync-initiator-skills.mjs");
runNodeScript(root, "sync-fire-md.mjs");
runNodeScript(root, "aggregate-truth.mjs");
runNodeScript(root, "sync-external-brief.mjs");
runNodeScript(root, "validate-truth-matrix.mjs");
runNodeScript(root, "validate-fire-metrics.mjs");

if (!runGitDiff(root, trackedFireSyncOutputs)) {
  fail(
    `fire-sync drift detected in tracked outputs. Run \`pnpm fire:sync\` and commit the resulting updates: ${trackedFireSyncOutputs.join(", ")}`,
  );
}

process.stdout.write("[assert-fire-sync-clean] PASS\n");
