import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { TasteIndex } from "./taste-types";

export type { TasteIndex } from "./taste-types";

const MODULE_DIR = dirname(fileURLToPath(import.meta.url));

function tasteIndexPathCandidates(): string[] {
  const fromEnv = (process.env.ALCHEMIST_TASTE_INDEX_PATH ?? "").trim();
  const envPath = fromEnv.length > 0 ? fromEnv : null;
  const fromModule = join(MODULE_DIR, "taste-index.json");
  const fromModuleExample = join(MODULE_DIR, "taste-index.example.json");
  const cwd = process.cwd();
  const fromMonorepo = join(cwd, "packages/shared-engine/learning/taste/taste-index.json");
  const fromMonorepoEx = join(cwd, "packages/shared-engine/learning/taste/taste-index.example.json");
  const fromPackage = join(cwd, "learning/taste/taste-index.json");
  const fromPackageEx = join(cwd, "learning/taste/taste-index.example.json");
  const out = [fromModule, fromModuleExample, fromMonorepo, fromMonorepoEx, fromPackage, fromPackageEx];
  if (envPath) out.unshift(envPath);
  return Array.from(new Set(out));
}

function isTasteIndex(value: unknown): value is TasteIndex {
  if (!value || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  if (o.schemaVersion !== "1.0") return false;
  if (!Array.isArray(o.generatedFrom) || o.generatedFrom.length < 1) return false;
  if (!Array.isArray(o.governanceHierarchy) || o.governanceHierarchy.length < 1) return false;
  if (!o.ownMusicAnchor || typeof o.ownMusicAnchor !== "object") return false;
  if (!o.lighthouseAnchor || typeof o.lighthouseAnchor !== "object") return false;
  if (!Array.isArray(o.tasteClusters) || o.tasteClusters.length < 1) return false;
  if (!o.globalBias || typeof o.globalBias !== "object") return false;
  const gb = o.globalBias as Record<string, unknown>;
  if (typeof gb.preferHighEnergy !== "boolean") return false;
  if (typeof gb.avoidHighAcousticness !== "boolean") return false;
  if (typeof gb.avoidHighInstrumentalness !== "boolean") return false;
  if (typeof gb.darkValenceBias !== "boolean") return false;
  if (!Array.isArray(gb.tempoRange) || gb.tempoRange.length !== 2) return false;
  for (const cl of o.tasteClusters) {
    if (!cl || typeof cl !== "object") return false;
    const c = cl as Record<string, unknown>;
    if (typeof c.id !== "string" || typeof c.weight !== "number") return false;
    if (typeof c.ownMusicAffinity !== "number" || typeof c.lighthouseAffinity !== "number") return false;
    if (!c.centroid || typeof c.centroid !== "object") return false;
  }
  return true;
}

/**
 * Loads `taste-index.json` or `taste-index.example.json` (Node only). Returns `null` if missing or invalid.
 */
export function loadTasteIndex(): TasteIndex | null {
  for (const p of tasteIndexPathCandidates()) {
    if (!existsSync(p)) continue;
    try {
      const raw = readFileSync(p, "utf8");
      const parsed: unknown = JSON.parse(raw);
      if (isTasteIndex(parsed)) return parsed;
    } catch {
      /* try next */
    }
  }
  return null;
}
