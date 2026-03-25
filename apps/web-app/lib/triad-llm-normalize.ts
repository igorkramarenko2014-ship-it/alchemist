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

/**
 * Merge partial LLM **`state`** into a full **`SerumState`** skeleton so strict gate integrity passes.
 * Arrays default to **`[]`**; object slots default to **`{}`**.
 */
export function coerceSerumStateFromLlm(raw: unknown): SerumState {
  const e = emptySerumState();
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    return e;
  }
  const o = raw as Record<string, unknown>;
  const obj = (x: unknown) =>
    x != null && typeof x === "object" && !Array.isArray(x) ? (x as SerumState["meta"]) : {};
  return {
    meta: { ...e.meta, ...obj(o.meta) },
    master: { ...e.master, ...obj(o.master) },
    oscA: { ...e.oscA, ...obj(o.oscA) },
    oscB: { ...e.oscB, ...obj(o.oscB) },
    noise: { ...e.noise, ...obj(o.noise) },
    filter: { ...e.filter, ...obj(o.filter) },
    fx: { ...e.fx, ...obj(o.fx) },
    envelopes: Array.isArray(o.envelopes) ? (o.envelopes as SerumState["envelopes"]) : e.envelopes,
    lfos: Array.isArray(o.lfos) ? (o.lfos as SerumState["lfos"]) : e.lfos,
    matrix: Array.isArray(o.matrix) ? (o.matrix as SerumState["matrix"]) : e.matrix,
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
  const state = coerceSerumStateFromLlm(o.state);
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
