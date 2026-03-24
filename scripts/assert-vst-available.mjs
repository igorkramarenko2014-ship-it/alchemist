#!/usr/bin/env node
/**
 * Filesystem check for **JUCE VST3 bundle** after **`pnpm build:vst`** (cmake in **`vst-build.mjs`**).
 *
 * **`REQUIRE_VST=1`** or **`ALCHEMIST_REQUIRE_VST=1`** → exit **1** if bundle missing (mirrors WASM assert).
 * Default → warn on stderr, exit **0** (optional sidecar).
 *
 * @see scripts/vst-build.mjs · docs/vst-wrapper.md
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { findVst3BuildBundlePath } from "./lib/vst-bundle-resolve.mjs";

function findMonorepoRoot(startDir) {
  let dir = startDir;
  for (let i = 0; i < 16; i++) {
    const pj = join(dir, "package.json");
    try {
      const j = JSON.parse(readFileSync(pj, "utf8"));
      if (j.name === "alchemist" && Array.isArray(j.workspaces)) return dir;
    } catch {
      /* ignore */
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

const here = dirname(fileURLToPath(import.meta.url));
const root = findMonorepoRoot(here) ?? findMonorepoRoot(process.cwd());
const requireVst =
  process.env.REQUIRE_VST === "1" || process.env.ALCHEMIST_REQUIRE_VST === "1";

if (!root) {
  console.error("assert-vst-available: monorepo root not found");
  process.exit(1);
}

const bundle = findVst3BuildBundlePath(root);

function fail(msg) {
  console.error(`assert-vst-available: ${msg}`);
  process.exit(requireVst ? 1 : 0);
}

if (!bundle) {
  fail(
    "VST3 bundle not found under apps/vst-wrapper/build/.../VST3 — run: pnpm build:vst (CMake + JUCE; network on first configure).",
  );
}

console.error(`assert-vst-available: OK — ${bundle}`);
process.exit(0);
