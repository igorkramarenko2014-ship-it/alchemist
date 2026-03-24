/**
 * Keyword sparse pre-filter (Phase 1) — shared by **`rankTaxonomy`** and optional
 * **`narrowTaxonomyPoolToTriadCandidates`** oversize fallback. **No** import from **`engine.ts`**
 * (avoids cycles with **`sparse-rank.ts`**).
 */
import type { AICandidate } from "@alchemist/shared-types";

function promptKeywords(prompt: string): string[] {
  return prompt
    .toLowerCase()
    .split(/\s+/)
    .map((k) => k.trim())
    .filter((k) => k.length > 0);
}

/**
 * O(n × keywords) scan: match any token against **`reasoning`** (lowercased).
 * Empty prompt → first **`cap`** rows (deterministic).
 */
export function filterTaxonomyByPromptKeywordsWithCap(
  prompt: string,
  fullTaxonomy: readonly AICandidate[],
  cap: number,
): AICandidate[] {
  const keywords = promptKeywords(prompt);

  if (keywords.length === 0) {
    return fullTaxonomy.slice(0, cap);
  }

  const sparse = fullTaxonomy.filter((item) => {
    const text = item.reasoning.toLowerCase();
    return keywords.some((k) => text.includes(k));
  });
  return sparse.slice(0, cap);
}
