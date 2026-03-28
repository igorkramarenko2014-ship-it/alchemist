#!/usr/bin/env node
/**
 * PNH APT — **Happy Panda victim channel** (preflight only).
 *
 * Heuristics must stay aligned with:
 *   `packages/shared-engine/pnh/pnh-apt-prompt-scan.ts` (`PROMPT_PATTERN_BY_SCENARIO` + catalog order).
 *
 * Scans argv + selected env for the same patterns triad uses for prompt-side APT hints.
 * Observability + optional hard stop — does **not** change triad gates (no shadow governance).
 */
/** @type {readonly string[]} Same order as `PNH_APT_SCENARIO_CATALOG`. */
const CATALOG_IDS_ORDER = [
  "bamboo_sprout",
  "empty_bowl",
  "mirror_image",
  "silk_thread",
  "paper_tiger",
  "dragons_breath",
  "jade_rabbit",
];

/** @type {Readonly<Record<string, readonly RegExp[]>>} */
const PROMPT_PATTERN_BY_SCENARIO = {
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

const catalogIdSet = new Set(CATALOG_IDS_ORDER);

/**
 * @param {string} text
 * @returns {readonly string[]}
 */
export function detectPnhAptMatchesForPreflight(text) {
  const t = text.trim();
  if (t.length === 0) return [];
  const ids = new Set();
  for (const [scenarioId, patterns] of Object.entries(PROMPT_PATTERN_BY_SCENARIO)) {
    if (!catalogIdSet.has(scenarioId)) continue;
    if (patterns.some((re) => re.test(t))) ids.add(scenarioId);
  }
  return CATALOG_IDS_ORDER.filter((id) => ids.has(id));
}

/**
 * Victim channel: what an auto-injected dev shell / CI env could poison before `pnpm dev`.
 * @param {NodeJS.ProcessEnv} env
 */
export function buildHappyPandaVictimBlob(env, argv) {
  const parts = [argv.join(" "), env.NODE_OPTIONS ?? "", env.npm_config_user_agent ?? ""];
  for (const [k, v] of Object.entries(env)) {
    if (typeof v !== "string") continue;
    if (!k.startsWith("ALCHEMIST_")) continue;
    if (k === "ALCHEMIST_SKIP_PANDA" || k === "ALCHEMIST_SKIP_PNH_PREFLIGHT") continue;
    parts.push(`${k}=${v}`);
  }
  return parts.join("\n");
}

/**
 * @returns {{ matches: readonly string[], blob: string }}
 */
export function scanHappyPandaVictimChannel() {
  const blob = buildHappyPandaVictimBlob(process.env, process.argv);
  const matches = detectPnhAptMatchesForPreflight(blob);
  return { matches, blob };
}
