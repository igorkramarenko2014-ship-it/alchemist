import fs from "node:fs";
import path from "node:path";

export interface GFUSCBurnState {
  state: "burned";
  burnedAtUtc: string;
  killswitchGeneration: number;
  triggerDetails: {
    scenarioId: string;
    harmIndex: number;
    triggeredVectors: string[];
  };
}

/**
 * Checks if the GFUSC burn state lockfile exists and returns its content if it does.
 */
export function getGFUSCBurnState(): GFUSCBurnState | null {
  // Use same heuristic as API health to find monorepo root
  const root = resolveMonorepoRoot();
  if (!root) return null;

  const burnStatePath = path.join(root, "artifacts", "gfusc-burn-state.json");
  if (fs.existsSync(burnStatePath)) {
    try {
      const content = fs.readFileSync(burnStatePath, "utf8");
      return JSON.parse(content) as GFUSCBurnState;
    } catch {
      return null;
    }
  }
  return null;
}

function resolveMonorepoRoot(): string | null {
  const cwd = process.cwd();
  const candidates = [
    cwd,
    path.join(cwd, ".."),
    path.join(cwd, "..", ".."),
    path.join(cwd, "..", "..", ".."),
  ];
  for (const c of candidates) {
    const norm = path.normalize(c);
    // Look for a unique marker of the monorepo root
    if (fs.existsSync(path.join(norm, "pnpm-workspace.yaml"))) {
      return norm;
    }
  }
  return null;
}
