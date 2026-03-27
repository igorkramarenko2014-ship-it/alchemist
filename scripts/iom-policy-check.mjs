#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { scanIomGhostArtifacts } from "./lib/iom-registry-scan.mjs";

function findMonorepoRoot(startDir) {
  let dir = startDir;
  for (let i = 0; i < 16; i++) {
    const pj = join(dir, "package.json");
    if (existsSync(pj)) {
      try {
        const j = JSON.parse(readFileSync(pj, "utf8"));
        if (j.name === "alchemist" && Array.isArray(j.workspaces)) return dir;
      } catch {
        // ignore
      }
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function readText(path) {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return "";
  }
}

const here = dirname(fileURLToPath(import.meta.url));
const root = findMonorepoRoot(here) ?? findMonorepoRoot(process.cwd());
if (!root) {
  process.stderr.write("[iom:policy-check] monorepo root not found\n");
  process.exit(1);
}

let ghosts = [];
try {
  ghosts = scanIomGhostArtifacts(root).ghostArtifacts;
} catch (e) {
  process.stderr.write(`[iom:policy-check] ghost scan failed: ${String(e)}\n`);
  process.exit(1);
}

const rllPath = join(root, "packages", "shared-engine", "reality-signals-log.ts");
const rll = readText(rllPath);
const hasStubLearningConst = rll.includes(
  "ALLOW_STUB_LEARNING = process.env.ALCHEMIST_ALLOW_STUB_LEARNING === \"1\""
);
const hasStubLearningGuard = rll.includes("payload.mode === \"stub\" && !ALLOW_STUB_LEARNING");

let failed = false;
if (ghosts.length > 0) {
  failed = true;
  process.stderr.write(
    `[iom:policy-check] ${ghosts.length} shared-engine source(s) missing from igor-power-cells.json artifacts:\n`
  );
  for (const g of ghosts) process.stderr.write(`  - ${g}\n`);
}
if (!hasStubLearningConst || !hasStubLearningGuard) {
  failed = true;
  process.stderr.write(
    "[iom:policy-check] stub-learning lock missing in reality-signals-log.ts (need ALLOW_STUB_LEARNING + stub guard)\n"
  );
}

if (failed) {
  process.exit(1);
}

process.stdout.write(
  "[iom:policy-check] OK — IOM artifact registration complete and stub-learning lock enforced.\n"
);
