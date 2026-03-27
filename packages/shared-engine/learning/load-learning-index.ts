import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export type LearningLesson = {
  id: string;
  style: string;
  character: string;
  causalReasoning: string;
  tags: string[];
  mappingKeys: string[];
};

export type LearningIndex = {
  generatedAtUtc: string;
  schemaVersion: string;
  lessonCount: number;
  lessons: LearningLesson[];
};

const MODULE_DIR = dirname(fileURLToPath(import.meta.url));

function learningIndexPathCandidates(): string[] {
  const fromModule = join(MODULE_DIR, "learning-index.json");
  const cwd = process.cwd();
  const fromMonorepo = join(cwd, "packages/shared-engine/learning/learning-index.json");
  const fromPackage = join(cwd, "learning/learning-index.json");
  const fromEnv = (process.env.ALCHEMIST_LEARNING_INDEX_PATH ?? "").trim();
  const envPath = fromEnv.length > 0 ? fromEnv : null;
  const out = [fromModule, fromMonorepo, fromPackage];
  if (envPath) out.unshift(envPath);
  return Array.from(new Set(out));
}

function isLearningIndex(value: unknown): value is LearningIndex {
  if (!value || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  if (typeof o.generatedAtUtc !== "string") return false;
  if (typeof o.schemaVersion !== "string") return false;
  if (typeof o.lessonCount !== "number" || !Number.isFinite(o.lessonCount)) return false;
  if (!Array.isArray(o.lessons)) return false;
  if (o.lessonCount !== o.lessons.length) return false;
  for (const row of o.lessons) {
    if (!row || typeof row !== "object") return false;
    const L = row as Record<string, unknown>;
    if (typeof L.id !== "string" || typeof L.style !== "string") return false;
    if (typeof L.character !== "string" || typeof L.causalReasoning !== "string") return false;
    if (!Array.isArray(L.tags) || !Array.isArray(L.mappingKeys)) return false;
    if (!L.tags.every((t) => typeof t === "string")) return false;
    if (!L.mappingKeys.every((k) => typeof k === "string")) return false;
  }
  return true;
}

/**
 * Loads the generated `learning-index.json` (Node only). Returns `null` if missing or invalid — safe for callers.
 */
export function loadLearningIndex(): LearningIndex | null {
  for (const p of learningIndexPathCandidates()) {
    if (!existsSync(p)) continue;
    try {
      const raw = readFileSync(p, "utf8");
      const parsed: unknown = JSON.parse(raw);
      if (isLearningIndex(parsed)) return parsed;
    } catch {
      /* try next candidate */
    }
  }
  return null;
}
