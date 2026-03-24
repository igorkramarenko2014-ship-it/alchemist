/**
 * Optional structured view of **`verify_post_summary`** / SOE-style **string** hints.
 * **`soeHint` on the wire stays a string** until consumers opt in — see **`docs/FIRE.md` §M**.
 */
export type StructuredSoeSeverity = "info" | "warning" | "critical";

export interface StructuredSoeHint {
  message: string;
  recommendationId: string;
  severity: StructuredSoeSeverity;
  affectedMetrics: string[];
  actionable: boolean;
  suggestedCommand?: string;
  docsPath?: string;
}

const PATTERNS: ReadonlyArray<{
  pattern: RegExp;
  map: (message: string) => Omit<StructuredSoeHint, "message"> & { message?: string };
}> = [
  {
    pattern: /velocity|latency|timeout|wall time/i,
    map: () => ({
      recommendationId: "VELOCITY_LOW",
      severity: "warning",
      affectedMetrics: ["meanPanelistMs", "triadFailureRate"],
      actionable: true,
      suggestedCommand: "Review TRIAD_PANELIST_CLIENT_TIMEOUT_MS / AI_TIMEOUT_MS in constants; pnpm verify:harsh",
      docsPath: "docs/FIRE.md",
    }),
  },
  {
    pattern: /gate drop|slavic|cosine|dice|undercover/i,
    map: () => ({
      recommendationId: "GATE_DROP_HIGH",
      severity: "warning",
      affectedMetrics: ["gateDropRate", "meanPanelistMs"],
      actionable: true,
      suggestedCommand: "pnpm test:real-gates — see FIRESTARTER calibration / gate observation",
      docsPath: "docs/FIRE.md",
    }),
  },
  {
    pattern: /wasm|encoder|export|fxp|pkg\//i,
    map: () => ({
      recommendationId: "WASM_UNAVAILABLE",
      severity: "critical",
      affectedMetrics: ["wasmStatus"],
      actionable: true,
      suggestedCommand: "pnpm build:wasm && REQUIRE_WASM=1 pnpm assert:wasm",
      docsPath: "docs/FIRESTARTER.md",
    }),
  },
  {
    pattern: /triad failure|panelist|provider key|api key|fetcher/i,
    map: () => ({
      recommendationId: "TRIAD_FAILURE",
      severity: "critical",
      affectedMetrics: ["triadFailureRate", "livePanelists"],
      actionable: true,
      suggestedCommand: "pnpm verify:keys",
      docsPath: "docs/FIRE.md",
    }),
  },
  {
    pattern: /iom|igor|orchestrator|schism/i,
    map: () => ({
      recommendationId: "IOM_SCHISM",
      severity: "warning",
      affectedMetrics: ["iomCoverageScore", "schisms"],
      actionable: true,
      suggestedCommand: "pnpm iom:status && pnpm igor:sync",
      docsPath: "docs/iom.md",
    }),
  },
];

/** Heuristic mapping — best-effort; unknown copy becomes `SOE_HINT_UNKNOWN`. */
export function parseLegacySoeHintMessage(message: string): StructuredSoeHint {
  const trimmed = message.trim();
  for (const { pattern, map } of PATTERNS) {
    if (pattern.test(trimmed)) {
      const m = map(trimmed);
      return {
        message: m.message ?? trimmed,
        recommendationId: m.recommendationId,
        severity: m.severity,
        affectedMetrics: m.affectedMetrics,
        actionable: m.actionable,
        ...(m.suggestedCommand && { suggestedCommand: m.suggestedCommand }),
        ...(m.docsPath && { docsPath: m.docsPath }),
      };
    }
  }
  return {
    message: trimmed,
    recommendationId: "SOE_HINT_UNKNOWN",
    severity: "info",
    affectedMetrics: [],
    actionable: false,
  };
}
