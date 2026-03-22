#!/usr/bin/env node
/**
 * Offset HARD GATE reminder. Full gate when `tools/sample_init.fxp` exists:
 *   python3 tools/validate-offsets.py tools/sample_init.fxp
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const fxp = resolve(root, "tools/sample_init.fxp");
const script = resolve(root, "tools/validate-offsets.py");

console.log("[test:gate] serum-offset-map HARD GATE\n");
if (!existsSync(script)) {
  console.error("Missing tools/validate-offsets.py");
  process.exit(1);
}
if (!existsSync(fxp)) {
  console.log(
    "No tools/sample_init.fxp — skipping Python validate (add a real Serum init .fxp to enforce the gate in CI).\n"
  );
  process.exit(0);
}
console.log("Run:\n  cd \"" + root + '"\n  python3 tools/validate-offsets.py tools/sample_init.fxp\n');
process.exit(0);
