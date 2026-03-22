/**
 * Keyword tablebase lookup before the triad (deterministic "known-good" path).
 * Naming references solved-game / opening-book style routing — not DSP.
 */
import type { AICandidate } from "@alchemist/shared-types";
import { logEvent } from "../telemetry";
import type { TablebaseRecord } from "./tablebase-schema";
import { TABLEBASE_RECORDS } from "./tablebase-db";

function normalizePrompt(prompt: string): string {
  return prompt.trim().toLowerCase();
}

/**
 * First matching record for the prompt, scanning `records` in order (explicit priority).
 */
export function findTablebaseRecordForPrompt(
  prompt: string,
  records: readonly TablebaseRecord[] = TABLEBASE_RECORDS
): TablebaseRecord | null {
  const n = normalizePrompt(prompt);
  if (!n) return null;
  for (const r of records) {
    if (r.keywords.some((k) => n.includes(k.toLowerCase().trim()))) {
      return r;
    }
  }
  return null;
}

/**
 * Returns a **clone** of the tablebase candidate, or `null` if no keyword hit.
 * Emits structured telemetry on hit (FIRE / auditable stderr JSON lines).
 */
export function lookupTablebaseCandidate(prompt: string, runId?: string): AICandidate | null {
  const hit = findTablebaseRecordForPrompt(prompt, TABLEBASE_RECORDS);
  if (!hit) return null;
  logEvent("preset_tablebase_hit", {
    runId,
    tablebaseId: hit.id,
    panelist: hit.candidate.panelist,
  });
  return structuredClone(hit.candidate);
}
