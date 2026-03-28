"use server";

import { loadLearningIndex, type LearningLesson } from "@alchemist/shared-engine/node";

/**
 * Phase 3 — lessons for `scoreCandidates` corpus-affinity prior (Node only).
 * Opt-in: **`ALCHEMIST_CORPUS_PRIOR=1`** server env + `pnpm learning:build-index`.
 */
export async function getCorpusScoringLessons(): Promise<LearningLesson[]> {
  if (process.env.ALCHEMIST_CORPUS_PRIOR !== "1") return [];
  return loadLearningIndex()?.lessons ?? [];
}
