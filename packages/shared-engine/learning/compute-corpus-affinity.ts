import type { AICandidate } from "@alchemist/shared-types";
import type { LearningLesson } from "./lesson-types";

/** Per-lesson row from `learning-index.json` (alias for callers / docs). */
export type LearningIndexLesson = LearningLesson;

function tokenizeLower(s: string): string[] {
  return s
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 1);
}

/** Dot-paths to leaf values under `SerumState` (and nested objects). */
export function collectLeafParamPaths(value: unknown, prefix = ""): string[] {
  if (value === null || value === undefined) return [];
  if (typeof value !== "object") return prefix ? [prefix] : [];
  if (Array.isArray(value)) {
    return value.flatMap((v, i) =>
      collectLeafParamPaths(v, prefix ? `${prefix}.${i}` : String(i)),
    );
  }
  const o = value as Record<string, unknown>;
  const keys = Object.keys(o);
  if (keys.length === 0) return prefix ? [prefix] : [];
  const out: string[] = [];
  for (const k of keys) {
    const p = prefix ? `${prefix}.${k}` : k;
    const v = o[k];
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      out.push(...collectLeafParamPaths(v, p));
    } else {
      out.push(p);
    }
  }
  return out;
}

function paramOverlapScore(candidate: AICandidate, lesson: LearningLesson): number {
  const paths = collectLeafParamPaths(candidate.state).map((x) => x.toLowerCase());
  if (paths.length === 0) return 0;
  const lessonKeys = lesson.mappingKeys.map((k) => k.toLowerCase());
  if (lessonKeys.length === 0) return 0;
  const set = new Set(lessonKeys);
  let overlap = 0;
  for (const pk of paths) {
    if (set.has(pk)) overlap += 1;
  }
  const denom = Math.max(paths.length, lessonKeys.length, 1);
  return overlap / denom;
}

function textOverlapScore(candidate: AICandidate, lesson: LearningLesson): number {
  const text = `${candidate.description ?? ""} ${candidate.reasoning ?? ""}`.toLowerCase();
  if (!text.trim()) return 0;
  let matches = 0;
  for (const tag of lesson.tags) {
    const t = tag.trim().toLowerCase();
    if (t.length > 1 && text.includes(t)) matches += 1;
  }
  for (const w of tokenizeLower(lesson.style)) {
    if (w.length > 2 && text.includes(w)) matches += 1;
  }
  const denom = Math.max(lesson.tags.length + 1, 1);
  return Math.min(1, matches / denom);
}

/**
 * Deterministic [0,1] corpus affinity — no I/O, never throws.
 * `SerumState` leaf paths are matched to `lesson.mappingKeys` (exact, case-insensitive).
 */
export function computeCorpusAffinity(
  candidate: AICandidate,
  lessons: LearningIndexLesson[],
): number {
  try {
    if (!lessons.length) return 0;
    let rawParam = 0;
    let rawText = 0;
    for (const lesson of lessons) {
      rawParam = Math.max(rawParam, paramOverlapScore(candidate, lesson));
      rawText = Math.max(rawText, textOverlapScore(candidate, lesson));
    }
    const affinity = rawParam * 0.7 + rawText * 0.3;
    return Math.min(1, Math.max(0, affinity));
  } catch {
    return 0;
  }
}
