/**
 * **Talent market scout** — compares triad signals to **operator-maintained** market rows.
 *
 * **FIRE-compliant:** recommendations + **`logEvent` only**. **No** shadow governance,
 * **no** automatic API/route mutation, **no** veto override of other engine modules,
 * **no** “amnesia” or silent state purge. Deployers change env & routes explicitly.
 */
import type { Panelist } from "@alchemist/shared-types";
import { computeTalentAgentAjiChatFusion, type AgentAjiChatFusion } from "../agent-fusion";
import { logEvent } from "../telemetry";
import marketBenchmarksJson from "./market-benchmarks.json";

export type MarketTalentRow = {
  id: string;
  displayName: string;
  /** Operator-defined 0–1 comparative strength (not live benchmark truth). */
  comparativeScore: number;
  freeTierOriented?: boolean;
  competesWithPanelist?: Panelist;
  notes?: string;
};

export type MarketBenchmarksDocument = {
  meta?: {
    version?: number;
    disclaimer?: string;
    updated?: string;
  };
  talents: MarketTalentRow[];
};

function isPanelist(s: string): s is Panelist {
  return s === "LLAMA" || s === "DEEPSEEK" || s === "QWEN";
}

/** Validate JSON shape at load; throws if unusable (fail loudly). */
export function parseMarketBenchmarksDocument(raw: unknown): MarketBenchmarksDocument {
  if (raw === null || typeof raw !== "object") {
    throw new Error("Talent market benchmarks: expected object root");
  }
  const o = raw as Record<string, unknown>;
  const talentsRaw = o.talents;
  if (!Array.isArray(talentsRaw) || talentsRaw.length === 0) {
    throw new Error("Talent market benchmarks: talents[] required and non-empty");
  }
  const talents: MarketTalentRow[] = [];
  for (const row of talentsRaw) {
    if (row === null || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const id = typeof r.id === "string" ? r.id : "";
    const displayName = typeof r.displayName === "string" ? r.displayName : "";
    const comparativeScore =
      typeof r.comparativeScore === "number" && Number.isFinite(r.comparativeScore)
        ? Math.min(1, Math.max(0, r.comparativeScore))
        : NaN;
    if (!id || !displayName || Number.isNaN(comparativeScore)) {
      throw new Error(`Talent market benchmarks: invalid talent row for id=${id || "?"}`);
    }
    let competesWithPanelist: Panelist | undefined;
    if (typeof r.competesWithPanelist === "string" && isPanelist(r.competesWithPanelist)) {
      competesWithPanelist = r.competesWithPanelist;
    }
    talents.push({
      id,
      displayName,
      comparativeScore,
      freeTierOriented: r.freeTierOriented === true,
      competesWithPanelist,
      notes: typeof r.notes === "string" ? r.notes : undefined,
    });
  }
  if (talents.length === 0) {
    throw new Error("Talent market benchmarks: no valid talent rows");
  }
  return {
    meta:
      o.meta !== null && typeof o.meta === "object"
        ? (o.meta as MarketBenchmarksDocument["meta"])
        : undefined,
    talents,
  };
}

const DEFAULT_DOC: MarketBenchmarksDocument =
  parseMarketBenchmarksDocument(marketBenchmarksJson);

export function getDefaultMarketBenchmarks(): MarketBenchmarksDocument {
  return DEFAULT_DOC;
}

export interface TalentMarketAnalysisInput {
  /**
   * Per-panelist health in [0,1] when you have them (e.g. rolling success rate).
   * Preferred for “weakest link” style hints.
   */
  panelistHealth?: Partial<Record<Panelist, number>>;
  /** Aggregate triad health [0,1] — used when per-panelist scores are absent. */
  triadHealthScore?: number;
  /**
   * If best market comparative score minus weakest observed score ≥ this threshold,
   * suggest **operator** review (not auto-swap). Default **0.15** on 0–1 scale.
   */
  marketGapThreshold?: number;
  benchmarks?: MarketBenchmarksDocument;
}

export interface TalentMarketAnalysisResult {
  weakestPanelist: Panelist | null;
  weakestScore: number | null;
  topMarketTalentId: string;
  topMarketTalentDisplayName: string;
  topMarketScore: number;
  gap: number;
  /** True → review routing / models in deploy config; engine does not mutate endpoints. */
  operatorReviewSuggested: boolean;
  reason: string;
  /** Matching market row for weakest panelist role when identifiable. */
  suggestedMarketTalent?: MarketTalentRow;
  /** Deterministic agent-aji chat fusion lines (hints only). */
  agentAjiChatFusion: AgentAjiChatFusion;
}

function topMarketTalent(doc: MarketBenchmarksDocument): MarketTalentRow {
  return [...doc.talents].sort((a, b) => b.comparativeScore - a.comparativeScore)[0];
}

function talentForPanelist(
  doc: MarketBenchmarksDocument,
  p: Panelist
): MarketTalentRow | undefined {
  const candidates = doc.talents.filter((t) => t.competesWithPanelist === p);
  if (candidates.length === 0) return undefined;
  return [...candidates].sort((a, b) => b.comparativeScore - a.comparativeScore)[0];
}

/**
 * Compare triad health signals to **editable** market rows; returns a **hint** only.
 * Never performs model swap or writes deploy configuration.
 */
export function analyzeTalentMarket(
  input: TalentMarketAnalysisInput
): TalentMarketAnalysisResult {
  const doc = input.benchmarks ?? DEFAULT_DOC;
  const threshold = input.marketGapThreshold ?? 0.15;
  const top = topMarketTalent(doc);

  const entries = Object.entries(input.panelistHealth ?? {}).filter(
    ([, v]) => typeof v === "number" && Number.isFinite(v)
  ) as [Panelist, number][];

  let weakestPanelist: Panelist | null = null;
  let weakestScore: number | null = null;

  if (entries.length > 0) {
    entries.sort(([, a], [, b]) => a - b);
    weakestPanelist = entries[0][0];
    weakestScore = Math.min(1, Math.max(0, entries[0][1]));
  } else if (
    input.triadHealthScore !== undefined &&
    Number.isFinite(input.triadHealthScore)
  ) {
    weakestScore = Math.min(1, Math.max(0, input.triadHealthScore));
  } else {
    return {
      weakestPanelist: null,
      weakestScore: null,
      topMarketTalentId: top.id,
      topMarketTalentDisplayName: top.displayName,
      topMarketScore: top.comparativeScore,
      gap: 0,
      operatorReviewSuggested: false,
      reason:
        "Insufficient data: pass panelistHealth and/or triadHealthScore for market comparison.",
      agentAjiChatFusion: computeTalentAgentAjiChatFusion({
        insufficientData: true,
        operatorReviewSuggested: false,
        gap: 0,
        weakestPanelist: null,
      }),
    };
  }

  const gap = top.comparativeScore - (weakestScore as number);
  const operatorReviewSuggested = gap >= threshold;
  const suggestedMarketTalent =
    weakestPanelist !== null ? talentForPanelist(doc, weakestPanelist) : undefined;

  let reason: string;
  if (operatorReviewSuggested) {
    reason =
      weakestPanelist !== null
        ? `Weakest panelist ${weakestPanelist} at ${(weakestScore as number).toFixed(3)} vs top market row ${top.id} at ${top.comparativeScore.toFixed(3)} (gap ${gap.toFixed(3)} ≥ ${threshold}). Suggested: operator review routes/weights — engine does not auto-swap.`
        : `Aggregate triad health ${(weakestScore as number).toFixed(3)} vs top market row ${top.id} at ${top.comparativeScore.toFixed(3)} (gap ${gap.toFixed(3)} ≥ ${threshold}). Suggested: operator review — engine does not auto-swap.`;
  } else {
    reason = `Gap ${gap.toFixed(3)} below threshold ${threshold}; no operator review flag.`;
  }

  return {
    weakestPanelist,
    weakestScore,
    topMarketTalentId: top.id,
    topMarketTalentDisplayName: top.displayName,
    topMarketScore: top.comparativeScore,
    gap,
    operatorReviewSuggested,
    reason,
    suggestedMarketTalent,
    agentAjiChatFusion: computeTalentAgentAjiChatFusion({
      insufficientData: false,
      operatorReviewSuggested,
      gap,
      weakestPanelist,
    }),
  };
}

/** Auditable telemetry — optional; callers invoke when they want a log line. */
export function logTalentMarketAnalysis(
  result: TalentMarketAnalysisResult,
  runId?: string
): void {
  logEvent("talent_market_analysis", {
    runId,
    weakestPanelist: result.weakestPanelist,
    weakestScore: result.weakestScore,
    topMarketTalentId: result.topMarketTalentId,
    topMarketScore: result.topMarketScore,
    gap: result.gap,
    operatorReviewSuggested: result.operatorReviewSuggested,
    agentAjiFusionLines: result.agentAjiChatFusion.fusionLines,
    note: "Hint only — no automatic model swap; deployer updates configuration.",
  });
}
