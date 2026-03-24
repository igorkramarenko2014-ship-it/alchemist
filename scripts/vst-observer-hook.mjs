#!/usr/bin/env node
/**
 * **`pnpm vst:observe:gate`** — VST bridge **preflight** (validate only, no `.fxp` write).
 * For full encode + copy after HARD GATE, use **`pnpm vst:observe`** (fxp-encoder `vst-bridge-cli`).
 *
 * - Runs **`validate-offsets-if-sample.mjs`** (HARD GATE helper — no `.fxp` write here).
 * - Emits stderr JSON **`vst_observer_hook`** for log pipelines.
 * - Does **not** copy to Serum User presets; follow-up behind green HARD GATE + operator config.
 *
 * @see packages/shared-engine/vst-observer.ts (`vst_observer` power cell)
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

const here = dirname(fileURLToPath(import.meta.url));
const root = findMonorepoRoot(here) ?? findMonorepoRoot(process.cwd());
if (!root) {
  process.stderr.write(`${JSON.stringify({ ts: new Date().toISOString(), event: "vst_observer_hook", error: "monorepo_root_not_found" })}\n`);
  process.exit(1);
}

const validateScript = join(root, "scripts", "validate-offsets-if-sample.mjs");
const v = spawnSync(process.execPath, [validateScript], {
  cwd: root,
  encoding: "utf8",
  env: process.env,
});
const exitCode = v.status === null ? 1 : v.status;

process.stderr.write(
  `${JSON.stringify({
    ts: new Date().toISOString(),
    event: "vst_observer_hook",
    phase: "hard_gate_preflight",
    validateExitCode: exitCode,
    note: "Skeleton — no .fxp encode/copy. Next: wire encode + Serum path after validated sample + operator env.",
  })}\n`,
);

process.exit(exitCode);
