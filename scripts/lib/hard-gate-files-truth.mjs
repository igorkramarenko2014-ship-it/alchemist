/**
 * Filesystem truth for HARD GATE prerequisites (no Python run — does not validate bytes).
 * Mirrors what **`pnpm assert:hard-gate`** checks before invoking **`validate-offsets.py`**.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";

/**
 * @param {string} root — monorepo root
 * @returns {{
 *   hardGateOffsetMapFilePresent: boolean,
 *   hardGateValidateScriptPresent: boolean,
 *   hardGateSampleInitFxpPresent: boolean,
 * }}
 */
export function getHardGateFilesTruth(root) {
  const offsetMap = join(root, "packages", "fxp-encoder", "serum-offset-map.ts");
  const py = join(root, "tools", "validate-offsets.py");
  const sample = join(root, "tools", "sample_init.fxp");
  return {
    hardGateOffsetMapFilePresent: existsSync(offsetMap),
    hardGateValidateScriptPresent: existsSync(py),
    hardGateSampleInitFxpPresent: existsSync(sample),
  };
}
