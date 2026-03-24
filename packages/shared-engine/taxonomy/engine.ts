/**
 * Offline taxonomy → triad-sized candidate list.
 *
 * Large matrices (e.g. 45k rows) must be narrowed **before** calling into this module.
 * See `taxonomy/README.md` and FIRESTARTER §13.
 *
 * **Do not** copy-paste patterns that:
 * - import from non-existent `../gates/score` (use `../score`)
 * - call `slavicFilterDedupe(candidates)` — threshold is fixed in `score.ts` (`SLAVIC_FILTER_COSINE_THRESHOLD`)
 * - silent `slice` of a massive pool without keyword/index pre-pass — we **throw** unless **`oversizeKeywordFallback`** + non-empty **`prompt`** applies the keyword Phase-1 pass
 * - add `metadata` on `AICandidate` — type lives in `@alchemist/shared-types` without that field
 * - skip `scoreCandidates` — you lose `filterValid` + weighted sort (Slavic alone is not the full gate path)
 */
import type { AICandidate } from "@alchemist/shared-types";
import { formatBrainTaxonomyPoolBoundFusion } from "../brain-fusion-calibration.gen";
import { MAX_CANDIDATES } from "../constants";
import { scoreCandidates } from "../score";
import { logEvent } from "../telemetry";
import { filterTaxonomyByPromptKeywordsWithCap } from "./prompt-keyword-sparse";

/** Optional hints for future contextual ranking; pool size rules are unchanged. */
export interface NarrowTaxonomyOptions {
  /**
   * When **`oversizeKeywordFallback`** is true and **`prompt`** is non-empty, pools larger than
   * **`TAXONOMY_PRE_SLAVIC_POOL_MAX`** are narrowed with the same keyword pass as **`rankTaxonomy`**
   * Phase 1 (then scored). Default remains **throw** — prefer **`rankTaxonomy`** or offline index for huge sets.
   */
  prompt?: string;
  oversizeKeywordFallback?: boolean;
}

/**
 * Max rows accepted per call. Full taxonomy search happens **outside** shared-engine
 * (index, job queue, etc.); passing more fails loudly to avoid gate/UI overload.
 */
/** Max rows into **`scoreCandidates`** (after offline / keyword sparse narrow). Slavic dedupe is ~O(n²) — keep n bounded (e.g. 200, not 45k). */
export const TAXONOMY_PRE_SLAVIC_POOL_MAX = 200;

export class TaxonomyPoolTooLargeError extends Error {
  /** Agent-aji chat fusion lines for operators / UI (from `docs/brain.md` §9a via `formatBrainTaxonomyPoolBoundFusion`). */
  public readonly fusionHintLines: readonly string[];

  constructor(
    public readonly size: number,
    public readonly max: number
  ) {
    super(
      `Taxonomy pre-Slavic pool has ${size} candidates (max ${max}). ` +
        `Narrow offline before narrowTaxonomyPoolToTriadCandidates. See taxonomy/README.md.`
    );
    this.name = "TaxonomyPoolTooLargeError";
    this.fusionHintLines = [formatBrainTaxonomyPoolBoundFusion(size, max)];
  }
}

/**
 * Validates pool size, runs **`scoreCandidates`** (valid candidates + Slavic dedupe @ 0.80 + weighted sort),
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
  let pool = preSlavicPool;
  if (pool.length > TAXONOMY_PRE_SLAVIC_POOL_MAX) {
    const p = _options?.prompt?.trim() ?? "";
    if (_options?.oversizeKeywordFallback === true && p.length > 0) {
      pool = filterTaxonomyByPromptKeywordsWithCap(p, pool, TAXONOMY_PRE_SLAVIC_POOL_MAX);
      logEvent("taxonomy_oversize_keyword_fallback", {
        incomingSize: preSlavicPool.length,
        afterKeywordSparse: pool.length,
        cap: TAXONOMY_PRE_SLAVIC_POOL_MAX,
      });
    } else {
      throw new TaxonomyPoolTooLargeError(
        preSlavicPool.length,
        TAXONOMY_PRE_SLAVIC_POOL_MAX
      );
    }
  }
  return scoreCandidates(pool).slice(0, MAX_CANDIDATES);
}
