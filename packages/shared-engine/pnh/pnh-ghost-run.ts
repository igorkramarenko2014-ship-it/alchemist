/**
 * PNH ghost run — executes scenario probes against **local** engine logic (no network).
 */
import type { AICandidate, Panelist, SerumState } from "@alchemist/shared-types";
import { slavicFilterDedupe } from "../score";
import { consensusValidateCandidate, filterValid } from "../validate";
import { triadPanelistSystemPrompt } from "../triad-panelist-prompt";
import {
  PNH_PROMPT_DEFENSE_MARKERS,
  PNH_SCENARIOS,
  type PnhScenarioId,
  type PnhSeverity,
} from "./pnh-scenarios";

export type PnhProbeOutcome = "immune" | "breach";

export interface PnhProbeResult {
  readonly id: string;
  readonly outcome: PnhProbeOutcome;
  readonly detail: string;
}

export interface PnhScenarioResult {
  readonly scenarioId: PnhScenarioId;
  readonly severity: PnhSeverity;
  readonly probes: readonly PnhProbeResult[];
  readonly breachCount: number;
  readonly immuneCount: number;
  readonly suggestedFix?: string;
}

export interface ImmunityReport {
  readonly generatedAt: string;
  readonly scenarios: readonly PnhScenarioResult[];
  /** Count of **breach** probes on **high** severity scenarios only. */
  readonly highSeverityBreaches: number;
  readonly passed: boolean;
  /** De-duplicated fix hints when any scenario breached. */
  readonly suggestions: readonly string[];
}

function emptyState(): SerumState {
  return {
    meta: {},
    master: {},
    oscA: {},
    oscB: {},
    noise: {},
    filter: {},
    envelopes: [],
    lfos: [],
    fx: {},
    matrix: [],
  };
}

const LEGIBLE_REASON =
  "Synthetic PNH probe reasoning meets minimum legibility length for Slavic text gate.";

function baseCandidate(overrides: Partial<AICandidate> & Pick<AICandidate, "panelist" | "score">): AICandidate {
  return {
    state: emptyState(),
    reasoning: LEGIBLE_REASON,
    ...overrides,
  };
}

function healthyParam128(): number[] {
  return Array.from({ length: 128 }, (_, i) => ((i * 17) % 100) / 100);
}

function runGateBypassProbes(): PnhScenarioResult {
  const probes: PnhProbeResult[] = [];
  const scenario = PNH_SCENARIOS.find((s) => s.id === "GATE_BYPASS_PAYLOAD")!;

  {
    const c = baseCandidate({
      panelist: "LLAMA",
      score: 0.5,
      paramArray: [0.5, 1.5, 0.3],
    });
    const r = consensusValidateCandidate(c);
    const breach = r.valid;
    probes.push({
      id: "param_out_of_range",
      outcome: breach ? "breach" : "immune",
      detail: breach
        ? "consensusValidateCandidate accepted param > 1"
        : "rejected out-of-range param",
    });
  }

  {
    const c = baseCandidate({
      panelist: "QWEN",
      score: 0.5,
      paramArray: [0.1, Number.NaN, 0.2],
    });
    const r = consensusValidateCandidate(c);
    const breach = r.valid;
    probes.push({
      id: "param_nan",
      outcome: breach ? "breach" : "immune",
      detail: breach ? "consensusValidateCandidate accepted NaN" : "rejected NaN param",
    });
  }

  {
    const c = baseCandidate({
      panelist: "DEEPSEEK",
      score: 0.5,
      paramArray: [0.2, Number.POSITIVE_INFINITY],
    });
    const r = consensusValidateCandidate(c);
    const breach = r.valid;
    probes.push({
      id: "param_infinity",
      outcome: breach ? "breach" : "immune",
      detail: breach ? "consensusValidateCandidate accepted Infinity" : "rejected Infinity param",
    });
  }

  {
    const c = baseCandidate({ panelist: "LLAMA", score: 2, paramArray: healthyParam128() });
    const survivors = filterValid([c]);
    const breach = survivors.length > 0;
    probes.push({
      id: "score_out_of_band",
      outcome: breach ? "breach" : "immune",
      detail: breach ? "filterValid kept score > 1" : "filtered invalid score",
    });
  }

  const breachCount = probes.filter((p) => p.outcome === "breach").length;
  return {
    scenarioId: scenario.id,
    severity: scenario.severity,
    probes,
    breachCount,
    immuneCount: probes.length - breachCount,
    suggestedFix:
      breachCount > 0
        ? `Harden consensus / filterValid paths (${scenario.suggestedFixTargets.join(", ")}).`
        : undefined,
  };
}

function runPromptHijackProbes(): PnhScenarioResult {
  const probes: PnhProbeResult[] = [];
  const scenario = PNH_SCENARIOS.find((s) => s.id === "PROMPT_HIJACK_TRIAD")!;
  const panelists: Panelist[] = ["DEEPSEEK", "LLAMA", "QWEN"];

  for (const p of panelists) {
    const text = triadPanelistSystemPrompt(p);
    const missing = PNH_PROMPT_DEFENSE_MARKERS.filter((m) => !text.includes(m));
    const breach = missing.length > 0;
    probes.push({
      id: `prompt_markers_${p}`,
      outcome: breach ? "breach" : "immune",
      detail: breach
        ? `missing markers: ${missing.map((m) => JSON.stringify(m)).join(", ")}`
        : "all defense markers present",
    });
  }

  const breachCount = probes.filter((x) => x.outcome === "breach").length;
  return {
    scenarioId: scenario.id,
    severity: scenario.severity,
    probes,
    breachCount,
    immuneCount: probes.length - breachCount,
    suggestedFix:
      breachCount > 0
        ? `Extend triadPanelistSystemPrompt with required PNH markers (${scenario.suggestedFixTargets.join(", ")}).`
        : undefined,
  };
}

function runSlavicSwarmProbes(): PnhScenarioResult {
  const probes: PnhProbeResult[] = [];
  const scenario = PNH_SCENARIOS.find((s) => s.id === "SLAVIC_SWARM_CREDIT_DRAIN")!;
  const params = healthyParam128();
  const swarm: AICandidate[] = (["DEEPSEEK", "LLAMA", "QWEN", "LLAMA", "DEEPSEEK", "QWEN"] as const).map(
    (panelist, i) =>
      baseCandidate({
        panelist,
        score: 0.9 - i * 0.01,
        paramArray: [...params],
        reasoning: LEGIBLE_REASON,
      }),
  );
  const kept = slavicFilterDedupe(swarm, "PNH swarm dedupe probe");
  const breach = kept.length > 1;
  probes.push({
    id: "identical_param_swarm",
    outcome: breach ? "breach" : "immune",
    detail: breach
      ? `expected 1 survivor, kept ${kept.length} (Slavic dedupe leak)`
      : `collapsed swarm to ${kept.length} representative(s)`,
  });

  const breachCount = probes.filter((p) => p.outcome === "breach").length;
  return {
    scenarioId: scenario.id,
    severity: scenario.severity,
    probes,
    breachCount,
    immuneCount: probes.length - breachCount,
    suggestedFix:
      breachCount > 0
        ? `Tighten slavicFilterDedupe / cosine threshold (${scenario.suggestedFixTargets.join(", ")}).`
        : undefined,
  };
}

/**
 * Run all PNH scenarios and aggregate an **ImmunityReport**.
 * High-severity scenario with any **breach** probe → `passed === false`.
 */
export function runPnhGhostWar(): ImmunityReport {
  const scenarios = [runGateBypassProbes(), runPromptHijackProbes(), runSlavicSwarmProbes()] as const;
  let highSeverityBreaches = 0;
  const suggestionSet = new Set<string>();
  for (const s of scenarios) {
    if (s.severity === "high" && s.breachCount > 0) {
      highSeverityBreaches += s.breachCount;
      if (s.suggestedFix) suggestionSet.add(s.suggestedFix);
    }
    if (s.severity === "medium" && s.breachCount > 0 && s.suggestedFix) {
      suggestionSet.add(s.suggestedFix);
    }
  }
  const passed = highSeverityBreaches === 0;
  return {
    generatedAt: new Date().toISOString(),
    scenarios,
    highSeverityBreaches,
    passed,
    suggestions: Array.from(suggestionSet),
  };
}
