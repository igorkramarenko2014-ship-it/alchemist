/**
 * Keyword sparse pre-filter (Phase 1) — shared by **`rankTaxonomy`** and **`safeProcessTaxonomy`**.
 * **No** import from **`engine.ts`** (avoids cycles with **`sparse-rank.ts`**).
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

  const scored = fullTaxonomy.map((item, index) => {
    const text = item.reasoning.toLowerCase();
    let hits = 0;
    for (const k of keywords) {
      if (text.includes(k)) hits += 1;
    }
    return { item, hits, index };
  });
  const matched = scored.filter((s) => s.hits > 0);
  matched.sort((a, b) => {
    if (b.hits !== a.hits) return b.hits - a.hits;
    return a.index - b.index;
  });
  return matched.slice(0, cap).map((s) => s.item);
}
