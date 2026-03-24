#!/usr/bin/env node
/**
 * Browser **`.fxp`** shipping helper: **`pnpm build:wasm`** then **`REQUIRE_WASM=1 pnpm assert:wasm`**.
 * Does **not** run **`harshcheck`** or strict HARD GATE — add those in your deploy pipeline explicitly.
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
    console.error(`predeploy-wasm: "${label}" exited ${code}`);
    process.exit(code);
  }
}

run("build:wasm", "pnpm", ["build:wasm"], {});
run("assert:wasm", "pnpm", ["assert:wasm"], {
  REQUIRE_WASM: "1",
  ALCHEMIST_REQUIRE_WASM: "1",
});
console.log("predeploy-wasm: OK — WASM built and non-stub pkg verified");
