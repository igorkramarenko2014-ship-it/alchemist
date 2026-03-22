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

/**
 * Cap after keyword (or fallback) narrowing — keeps Slavic dedupe off the full ~45k set (O(n²) there).
 * Must be **≤ `TAXONOMY_PRE_SLAVIC_POOL_MAX`** so the engine accepts the output as-is.
 */
export const TAXONOMY_KEYWORD_SPARSE_MAX = TAXONOMY_PRE_SLAVIC_POOL_MAX;

function promptKeywords(prompt: string): string[] {
  return prompt
    .toLowerCase()
    .split(/\s+/)
    .map((k) => k.trim())
    .filter((k) => k.length > 0);
}

/**
 * **Phase 1:** O(n × keywords) scan of `fullTaxonomy`, match any token against **`reasoning`** (lowercased).
 * If there are no keywords (empty prompt), returns the first **`TAXONOMY_KEYWORD_SPARSE_MAX`** rows (deterministic).
 */
export function filterTaxonomyByPromptKeywords(
  prompt: string,
  fullTaxonomy: AICandidate[]
): AICandidate[] {
  const keywords = promptKeywords(prompt);
  const cap = TAXONOMY_KEYWORD_SPARSE_MAX;

  if (keywords.length === 0) {
    return fullTaxonomy.slice(0, cap);
  }

  const sparse = fullTaxonomy.filter((item) => {
    const text = item.reasoning.toLowerCase();
    return keywords.some((k) => text.includes(k));
  });
  return sparse.slice(0, cap);
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
  return narrowTaxonomyPoolToTriadCandidates(sparse, { prompt });
}
