#!/usr/bin/env node
/**
 * Runs tools/validate-offsets.py when tools/sample_init.fxp exists.
 * Exit 0 + stderr note when missing (does not fail CI / local dev).
 * Strict: ALCHEMIST_STRICT_OFFSETS=1 → exit 1 if sample missing.
 */
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sample = join(root, "tools", "sample_init.fxp");
const py = join(root, "tools", "validate-offsets.py");

if (!existsSync(py)) {
  console.error("validate-offsets-if-sample: missing tools/validate-offsets.py");
  process.exit(1);
}

if (!existsSync(sample)) {
  const msg =
    "validate-offsets-if-sample: skip — place a real Serum init preset at tools/sample_init.fxp then re-run. " +
    "See docs/FIRESTARTER.md HARD GATE + pnpm test:gate.";
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
process.exit(r.status ?? 1);
