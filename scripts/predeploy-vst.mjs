#!/usr/bin/env node
/**
 * Optional **native VST3** shipping helper: **`pnpm build:vst:full`** then **`REQUIRE_VST=1 pnpm assert:vst`**.
 * Does **not** replace **`predeploy`** (WASM); invoke explicitly in pipelines that ship the JUCE sidecar.
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

function run(label, file, args, env) {
  const r = spawnSync(file, args, {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
  const code = r.status ?? 1;
  if (code !== 0) {
    console.error(`predeploy-vst: "${label}" exited ${code}`);
    process.exit(code);
  }
}

run("build:vst:full", "pnpm", ["build:vst:full"], {});
run("assert:vst", "pnpm", ["assert:vst"], {
  REQUIRE_VST: "1",
  ALCHEMIST_REQUIRE_VST: "1",
});
console.log("predeploy-vst: OK — VST3 bundle present under apps/vst-wrapper/build");
