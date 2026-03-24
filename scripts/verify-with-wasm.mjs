#!/usr/bin/env node
/**
 * **Release-style** verify: full monorepo check, then **fail-closed** WASM (`REQUIRE_WASM=1`).
 *
 * Does **not** replace default **`pnpm harshcheck`** / **`pnpm verify:harsh`** — those stay green
 * without Rust (see **`docs/FIRE.md`** §E1.17). Use this before shipping **browser `.fxp`** export.
 *
 * **`ALCHEMIST_VERIFY_WASM_CHAIN`**: `harsh` (default) = **`pnpm harshcheck`**; `fast` = **`pnpm verify:harsh`** (no Next build).
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

function runPnpm(cwd, args, env) {
  return spawnSync("pnpm", args, {
    cwd,
    stdio: "inherit",
    shell: false,
    env: { ...process.env, ...env },
  });
}

const here = dirname(fileURLToPath(import.meta.url));
const root = findMonorepoRoot(here) ?? findMonorepoRoot(process.cwd());
if (!root) {
  process.stderr.write("[verify-with-wasm] monorepo root not found\n");
  process.exit(1);
}

const chain = process.env.ALCHEMIST_VERIFY_WASM_CHAIN === "fast" ? "fast" : "harsh";
const step1Args = chain === "fast" ? ["verify:harsh"] : ["harshcheck"];

process.stderr.write(
  `[verify-with-wasm] step 1: pnpm ${step1Args.join(" ")} (chain=${chain})\n`,
);
const r1 = runPnpm(root, step1Args, { ALCHEMIST_PNPM_FALLBACK_QUIET: "1" });
if (r1.status !== 0) {
  process.exit(r1.status === null ? 1 : r1.status);
}

process.stderr.write("[verify-with-wasm] step 2: REQUIRE_WASM=1 pnpm assert:wasm\n");
const r2 = runPnpm(root, ["assert:wasm"], { REQUIRE_WASM: "1", ALCHEMIST_REQUIRE_WASM: "1" });
process.exit(r2.status === null ? 1 : r2.status ?? 0);
