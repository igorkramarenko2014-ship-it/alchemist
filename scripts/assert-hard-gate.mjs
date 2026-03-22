#!/usr/bin/env node
/**
 * HARD GATE — run tools/validate-offsets.py against tools/sample_init.fxp when present.
 * Same contract as validate-offsets-if-sample.mjs; explicit name for pre-release / CI docs.
 *
 * ALCHEMIST_STRICT_OFFSETS=1 → exit 1 if sample missing (fail closed).
 * Otherwise missing sample → warn and exit 0 (local dev friendly).
 */
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sample = join(root, "tools", "sample_init.fxp");
const py = join(root, "tools", "validate-offsets.py");

if (!existsSync(py)) {
  console.error("assert-hard-gate: missing tools/validate-offsets.py");
  process.exit(1);
}

if (!existsSync(sample)) {
  const msg =
    "assert-hard-gate: tools/sample_init.fxp missing — offset map not validated against a real preset. " +
    "See docs/FIRESTARTER.md HARD GATE and pnpm test:gate.";
  if (process.env.ALCHEMIST_STRICT_OFFSETS === "1") {
    console.error(msg);
    process.exit(1);
  }
  console.warn(msg);
  process.exit(0);
}

const r = spawnSync(process.env.PYTHON ?? "python3", [py, sample], {
  cwd: root,
  stdio: "inherit",
});
const code = r.status ?? 1;
if (code === 0) {
  console.log("assert-hard-gate: OK — offset map validated against tools/sample_init.fxp");
}
process.exit(code);
