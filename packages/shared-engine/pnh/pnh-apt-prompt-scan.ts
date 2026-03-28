/**
 * Lightweight **prompt-only** heuristics aligned with **`PNH_APT_SCENARIO_CATALOG`** IDs.
 * Observability only — does **not** change gates, weights, or routes (no shadow governance).
 * Matches are coarse; false positives are acceptable for stderr/SIEM triage.
 *
 * **Keep in sync** with `scripts/pnh-preflight-apt.mjs` (`PROMPT_PATTERN_BY_SCENARIO` + catalog order).
 */
import { PNH_APT_SCENARIO_CATALOG } from "./pnh-apt-scenarios";

/** APT catalog IDs that warrant immediate operator visibility when prompt text hints at the pattern. */
const PROMPT_PATTERN_BY_SCENARIO: Readonly<Record<string, readonly RegExp[]>> = {
  mirror_image: [
    /stack\s*trace/i,
    /dump\s+(the\s+)?env/i,
    /NODE_ENV.*password/i,
    /reveal\s+(api|secret|key|token)/i,
  ],
  bamboo_sprout: [/enumerate\s+(all\s+)?(route|endpoint)/i, /slow\s+scan/i],
  silk_thread: [/timing\s+attack/i, /infer\s+the\s+threshold/i],
  paper_tiger: [/drift\s+the\s+gate/i, /bypass\s+undercover/i],
};

/**
 * Returns catalog scenario IDs whose prompt heuristics matched (deterministic order by catalog).
 */
export function detectPnhAptPromptMatches(prompt: string): readonly string[] {
  const t = prompt.trim();
  if (t.length === 0) return [];
  const ids = new Set<string>();
  const catalogIds = new Set(PNH_APT_SCENARIO_CATALOG.map((s) => s.id));
  for (const [scenarioId, patterns] of Object.entries(PROMPT_PATTERN_BY_SCENARIO)) {
    if (!catalogIds.has(scenarioId)) continue;
    if (patterns.some((re) => re.test(t))) ids.add(scenarioId);
  }
  return PNH_APT_SCENARIO_CATALOG.map((s) => s.id).filter((id) => ids.has(id));
}
