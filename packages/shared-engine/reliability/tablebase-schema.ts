/**
 * Deterministic preset tablebase (keyword → curated candidate).
 *
 * HARD GATE: Do not ship authoritative `paramArray` / Serum bytes here until each row is
 * validated against `serum-offset-map.ts` + real `.fxp` (see alchemist-brief / FIRESTARTER).
 * Empty `TABLEBASE_RECORDS` is the safe default.
 */
import type { AICandidate } from "@alchemist/shared-types";
import { REASONING_LEGIBILITY_MIN_CHARS } from "../validate";

export interface TablebaseRecord {
  /** Stable id for telemetry and audits. */
  id: string;
  /** Substrings matched against normalized prompt (lowercase trim). */
  keywords: readonly string[];
  /** Full triad candidate shape — same gates as live panelists. */
  candidate: AICandidate;
}

export function isTablebaseRecord(x: unknown): x is TablebaseRecord {
  if (x == null || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  if (typeof o.id !== "string" || o.id.trim().length === 0) return false;
  if (!Array.isArray(o.keywords) || o.keywords.length === 0) return false;
  if (!o.keywords.every((k) => typeof k === "string" && k.trim().length > 0)) return false;
  const c = o.candidate;
  if (c == null || typeof c !== "object") return false;
  const ac = c as Record<string, unknown>;
  if (ac.state == null || typeof ac.state !== "object") return false;
  if (typeof ac.score !== "number" || ac.score < 0 || ac.score > 1) return false;
  if (typeof ac.reasoning !== "string") return false;
  if (ac.reasoning.trim().length < REASONING_LEGIBILITY_MIN_CHARS) return false;
  if (ac.panelist !== "LLAMA" && ac.panelist !== "DEEPSEEK" && ac.panelist !== "QWEN") return false;
  if (ac.paramArray != null) {
    if (!Array.isArray(ac.paramArray) || !ac.paramArray.every((n) => typeof n === "number"))
      return false;
  }
  return true;
}
