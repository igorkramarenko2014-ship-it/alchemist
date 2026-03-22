/**
 * Offline taxonomy → triad-sized candidate list.
 *
 * Large matrices (e.g. 45k rows) must be narrowed **before** calling into this module.
 * See `taxonomy/README.md` and FIRESTARTER §13.
 *
 * **Do not** copy-paste patterns that:
 * - import from non-existent `../gates/score` (use `../score`)
 * - call `slavicFilterDedupe(candidates, 0.92)` — threshold is fixed in `score.ts` (`SLAVIC_FILTER_COSINE_THRESHOLD`)
 * - silent `slice` of a massive pool without keyword/index pre-pass — we **throw** if `length > TAXONOMY_PRE_SLAVIC_POOL_MAX`
 * - add `metadata` on `AICandidate` — type lives in `@alchemist/shared-types` without that field
 * - skip `scoreCandidates` — you lose `filterValid` + weighted sort (Slavic alone is not the full gate path)
 */
import type { AICandidate } from "@alchemist/shared-types";
import { MAX_CANDIDATES } from "../constants";
import { scoreCandidates } from "../score";

/** Optional hints for future contextual ranking; pool size rules are unchanged. */
export interface NarrowTaxonomyOptions {
  /**
   * Reserved for future use (e.g. contextual entropy). Offline semantic shortlist should
   * already match the prompt; caller must still pass **≤ `TAXONOMY_PRE_SLAVIC_POOL_MAX`** rows.
   */
  prompt?: string;
}

/**
 * Max rows accepted per call. Full taxonomy search happens **outside** shared-engine
 * (index, job queue, etc.); passing more fails loudly to avoid gate/UI overload.
 */
/** Max rows into **`scoreCandidates`** (after offline / keyword sparse narrow). Slavic dedupe is ~O(n²) — keep n bounded (e.g. 200, not 45k). */
export const TAXONOMY_PRE_SLAVIC_POOL_MAX = 200;

export class TaxonomyPoolTooLargeError extends Error {
  constructor(
    public readonly size: number,
    public readonly max: number
  ) {
    super(
      `Taxonomy pre-Slavic pool has ${size} candidates (max ${max}). ` +
        `Narrow offline before narrowTaxonomyPoolToTriadCandidates. See taxonomy/README.md.`
    );
    this.name = "TaxonomyPoolTooLargeError";
  }
}

/**
 * Validates pool size, runs **`scoreCandidates`** (valid candidates + Slavic dedupe @ 0.92 + weighted sort),
 * returns top **`MAX_CANDIDATES`** by weighted panelist score.
 *
 * **Sync** — no I/O. If you need async offline jobs, await **before** building `preSlavicPool`, then call this.
 *
 * Does **not** set telemetry fields, governance scores, or codenames — those stay on the
 * triad / monitor layer (`triad-monitor`, `triad-panel-governance`).
 */
export function narrowTaxonomyPoolToTriadCandidates(
  preSlavicPool: AICandidate[],
  _options?: NarrowTaxonomyOptions
): AICandidate[] {
  void _options?.prompt;
  if (preSlavicPool.length > TAXONOMY_PRE_SLAVIC_POOL_MAX) {
    throw new TaxonomyPoolTooLargeError(
      preSlavicPool.length,
      TAXONOMY_PRE_SLAVIC_POOL_MAX
    );
  }
  return scoreCandidates(preSlavicPool).slice(0, MAX_CANDIDATES);
}
