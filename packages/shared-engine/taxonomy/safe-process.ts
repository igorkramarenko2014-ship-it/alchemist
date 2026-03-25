/**
 * Single entry for taxonomy → triad-sized pool — **no silent >200 into Slavic**.
 * Prefer this over raw **`narrowTaxonomyPoolToTriadCandidates`** when pool size is unknown.
 */
import type { AICandidate } from "@alchemist/shared-types";
import { logEvent } from "../telemetry";
import { narrowTaxonomyPoolToTriadCandidates, TAXONOMY_PRE_SLAVIC_POOL_MAX } from "./engine";
import { rankTaxonomy } from "./sparse-rank";

export type TaxonomyProcessMode = "direct" | "ranked";

export type SafeTaxonomyProcessResult = {
  candidates: AICandidate[];
  taxonomyMode: TaxonomyProcessMode;
  taxonomySize: number;
  /** True when input was **`> TAXONOMY_PRE_SLAVIC_POOL_MAX`** and the ranked sparse path ran. */
  fallbackUsed: boolean;
};

/**
 * - **`≤ 200`** → **`narrowTaxonomyPoolToTriadCandidates`** (direct engine).
 * - **`> 200`** → **`rankTaxonomy`** (keyword sparse → engine); never throws **`TaxonomyPoolTooLargeError`** here.
 */
export function safeProcessTaxonomy(
  prompt: string,
  taxonomy: readonly AICandidate[]
): SafeTaxonomyProcessResult {
  const taxonomySize = taxonomy.length;
  const trimmed = prompt.trim();
  const asMutable = taxonomy as AICandidate[];

  if (taxonomySize > TAXONOMY_PRE_SLAVIC_POOL_MAX) {
    logEvent("taxonomy_safe_process", {
      taxonomyMode: "ranked" as const,
      taxonomySize,
      fallbackUsed: true,
      cap: TAXONOMY_PRE_SLAVIC_POOL_MAX,
    });
    const candidates = rankTaxonomy(trimmed, asMutable);
    return {
      candidates,
      taxonomyMode: "ranked",
      taxonomySize,
      fallbackUsed: true,
    };
  }

  logEvent("taxonomy_safe_process", {
    taxonomyMode: "direct" as const,
    taxonomySize,
    fallbackUsed: false,
    cap: TAXONOMY_PRE_SLAVIC_POOL_MAX,
  });
  const candidates = narrowTaxonomyPoolToTriadCandidates([...asMutable]);
  return {
    candidates,
    taxonomyMode: "direct",
    taxonomySize,
    fallbackUsed: false,
  };
}
