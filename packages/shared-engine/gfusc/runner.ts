import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { runGFUSCScenarios } from "./runner-logic";
import { type GFUSCRunResult } from "./verdict";
import { resolveGFUSCMode } from "./dryrun";

export { runGFUSCScenarios };

/**
 * Terminator abstraction for process exit.
 * Default is process.exit, can be mocked in tests.
 */
export type Terminator = (code: number) => never;

/**
 * Executes a LIVE killswitch by writing a burn state lockfile and terminating the process.
 * Only fires if resolveGFUSCMode() returns 'LIVE'.
 */
export function executeKillswitch(
  result: GFUSCRunResult,
  terminator: Terminator = (code) => {
    process.exit(code);
  },
): void {
  const mode = resolveGFUSCMode();
  if (mode !== "LIVE") {
    return;
  }

  const root = findMonorepoRoot(dirname(fileURLToPath(import.meta.url)));
  const burnStatePath = join(root, "artifacts", "gfusc-burn-state.json");

  const payload = {
    state: "burned",
    burnedAtUtc: result.evaluatedAtUtc,
    killswitchGeneration: 1,
    triggerDetails: {
      scenarioId: result.scenarioId,
      harmIndex: result.harmIndex,
      triggeredVectors: result.triggeredVectors,
    },
  };

  mkdirSync(dirname(burnStatePath), { recursive: true });
  writeFileSync(burnStatePath, JSON.stringify(payload, null, 2), "utf8");

  // Canonical exit code 117
  terminator(117);
}

export function findMonorepoRoot(startDir: string): string {
  let dir = startDir;
  for (let i = 0; i < 10; i++) {
    const candidate = join(dir, "pnpm-workspace.yaml");
    if (existsSync(candidate)) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}
