import type { AICandidate } from "@alchemist/shared-types";

/**
 * Task 1: Strict structural validation for panelist-returned candidate arrays.
 * Ensures the JSON is not just valid syntax, but matches the Alchemist engine's expected schema.
 */
export function isValidAICandidateArray(data: unknown): data is AICandidate[] {
  if (!Array.isArray(data)) return false;
  if (data.length === 0) return true; // Empty is valid but degraded

  for (const item of data) {
    if (typeof item !== "object" || item === null) return false;
    const c = item as Record<string, unknown>;

    // Required fields per Task 1 + engine core requirements
    if (typeof c.score !== "number") return false;
    if (typeof c.reasoning !== "string") return false;
    if (typeof c.panelist !== "string") return false;
    if (typeof c.state !== "object" || c.state === null) return false;
    
    // SerumState check (simplified structural check to avoid deep recursion if possible, 
    // but at least check top-level keys if they exist or if it's generally an object)
    const state = c.state as Record<string, unknown>;
    if (!state.oscA || !state.oscB || !state.filter) return false;

    // paramArray check if present (Consensus Validator needs this)
    if (c.paramArray !== undefined && !Array.isArray(c.paramArray)) return false;
  }

  return true;
}
