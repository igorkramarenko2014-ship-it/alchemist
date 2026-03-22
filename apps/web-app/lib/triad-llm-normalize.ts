import { isValidCandidate } from "@alchemist/shared-engine";
import type { AICandidate, Panelist, SerumState } from "@alchemist/shared-types";

export function emptySerumState(): SerumState {
  return {
    meta: {},
    master: {},
    oscA: {},
    oscB: {},
    noise: {},
    filter: {},
    envelopes: [],
    lfos: [],
    fx: {},
    matrix: [],
  };
}

/** Parse one LLM JSON object into an `AICandidate`; enforce `isValidCandidate`. */
export function normalizeRawCandidateItem(raw: unknown, panelist: Panelist): AICandidate | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const score = typeof o.score === "number" ? o.score : Number.NaN;
  const reasoning = typeof o.reasoning === "string" ? o.reasoning : "";
  let paramArray: number[] | undefined;
  if (Array.isArray(o.paramArray)) {
    const nums = o.paramArray.map((x) => (typeof x === "number" ? x : Number.NaN));
    if (nums.length > 0 && nums.every((x) => !Number.isNaN(x))) {
      paramArray = nums;
    }
  }
  const state =
    o.state != null && typeof o.state === "object"
      ? (o.state as SerumState)
      : emptySerumState();
  const candidate: AICandidate = {
    state,
    score,
    reasoning,
    panelist,
    ...(paramArray ? { paramArray } : {}),
  };
  if (typeof o.description === "string" && o.description.length > 0) {
    candidate.description = o.description;
  }
  return isValidCandidate(candidate) ? candidate : null;
}
