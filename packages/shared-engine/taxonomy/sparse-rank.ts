/**
 * Keyword sparse pre-filter → `narrowTaxonomyPoolToTriadCandidates`.
 *
 * Replaces incorrect patterns: no `item.description` (use **`reasoning`**), no **`../gates/score`**,
 * no second arg to **`slavicFilterDedupe`**, no **`metadata`** on **`AICandidate`**.
 */
import type { AICandidate } from "@alchemist/shared-types";
import {
  narrowTaxonomyPoolToTriadCandidates,
  TAXONOMY_PRE_SLAVIC_POOL_MAX,
} from "./engine";
import { filterTaxonomyByPromptKeywordsWithCap } from "./prompt-keyword-sparse";

/**
 * Cap after keyword (or fallback) narrowing — keeps Slavic dedupe off the full ~45k set (O(n²) there).
 * Must be **≤ `TAXONOMY_PRE_SLAVIC_POOL_MAX`** so the engine accepts the output as-is.
 */
export const TAXONOMY_KEYWORD_SPARSE_MAX = TAXONOMY_PRE_SLAVIC_POOL_MAX;

/**
 * **Phase 1:** O(n × keywords) scan of `fullTaxonomy`, match any token against **`reasoning`** (lowercased).
 * If there are no keywords (empty prompt), returns the first **`TAXONOMY_KEYWORD_SPARSE_MAX`** rows (deterministic).
 */
export function filterTaxonomyByPromptKeywords(
  prompt: string,
  fullTaxonomy: AICandidate[],
): AICandidate[] {
  return filterTaxonomyByPromptKeywordsWithCap(prompt, fullTaxonomy, TAXONOMY_KEYWORD_SPARSE_MAX);
}

/**
 * **Sync** — `async` in user snippets adds nothing without real I/O.
 *
 * Pipeline: keyword sparse (≤ **`TAXONOMY_KEYWORD_SPARSE_MAX`**) → **`narrowTaxonomyPoolToTriadCandidates`**
 * (**`scoreCandidates`**: valid + Slavic **0.80** cosine + weighted sort) → **≤ 8**.
 */
export function rankTaxonomy(
  prompt: string,
  fullTaxonomy: AICandidate[]
): AICandidate[] {
  const sparse = filterTaxonomyByPromptKeywords(prompt, fullTaxonomy);
  return narrowTaxonomyPoolToTriadCandidates(sparse);
}
