"use server";

import { loadTasteIndex, type TasteIndex } from "@alchemist/shared-engine/node";

/**
 * Phase 4 — taste index for `scoreCandidates` (Node only).
 * Opt-in: **`ALCHEMIST_TASTE_PRIOR=1`** + valid `taste-index.json` or `taste-index.example.json`.
 */
export async function getTasteIndexForScoring(): Promise<TasteIndex | null> {
  if (process.env.ALCHEMIST_TASTE_PRIOR !== "1") return null;
  return loadTasteIndex();
}
