#!/usr/bin/env node
/**
 * Optional CI gate: when **`IOM_ENFORCE_COVERAGE=1`**, fails if any `packages/shared-engine`
 * `.ts` sources (under the same rules as **`pnpm igor:heal`**) are missing from
 * **`igor-power-cells.json`** artifacts.
 */
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
        /* ignore */
      }
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function main() {
  const here = dirname(fileURLToPath(import.meta.url));
  const root = findMonorepoRoot(here) ?? findMonorepoRoot(process.cwd());
  if (!root) {
    process.stderr.write("[igor-ci-check] monorepo root not found\n");
    process.exit(1);
  }

  let ghosts;
  try {
    ghosts = scanIomGhostArtifacts(root).ghostArtifacts;
  } catch (e) {
    process.stderr.write(`[igor-ci-check] ${String(e?.message ?? e)}\n`);
    process.exit(1);
  }

  const enforce = process.env.IOM_ENFORCE_COVERAGE === "1";

  if (ghosts.length === 0) {
    process.stdout.write("[igor-ci-check] OK — no IOM ghost artifacts.\n");
    process.exit(0);
  }

  process.stderr.write(
    `[igor-ci-check] ${ghosts.length} shared-engine source(s) not covered by igor-power-cells.json:\n`,
  );
  for (const g of ghosts) process.stderr.write(`  - ${g}\n`);
  process.stderr.write("  Run pnpm igor:heal for JSONL proposals, then pnpm igor:apply or edit JSON + pnpm igor:sync\n");

  if (enforce) {
    process.stderr.write("[igor-ci-check] IOM_ENFORCE_COVERAGE=1 — failing.\n");
    process.exit(1);
  }

  process.stdout.write("[igor-ci-check] advisory only (set IOM_ENFORCE_COVERAGE=1 in CI to fail).\n");
  process.exit(0);
}

main();
