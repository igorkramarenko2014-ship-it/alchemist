/**
 * AI Triad: internal IDs `LLAMA` / `DEEPSEEK` / `QWEN` with blend weights in `constants`.
 * **Alchemist codenames** (Athena / Hermes / Hestia) are for UI + telemetry only.
 * 8 candidates; client fetch budget per panelist — see `TRIAD_PANELIST_CLIENT_TIMEOUT_MS` (≥ server upstream).
 */
import type {
  AICandidate,
  AIAnalysis,
  Panelist,
  SerumState,
  TriadPanelistRunOutcome,
  TriadParityMode,
  UserMode,
  TokenUsageMetrics,
} from "@alchemist/shared-types";
import { MAX_CANDIDATES, TRIAD_PANELIST_CLIENT_TIMEOUT_MS } from "./constants";
import { validatePromptForTriad } from "./prompt-guard";
import {
  applyPnhTriadPromptDefense,
  auditTriadCandidatesForPnhResponseEcho,
  hashPromptForTelemetry,
  type PnhTriadIntervention,
} from "./pnh/pnh-triad-defense";
import type { PnhTriadLane } from "./pnh/pnh-context-types";
import {
  logAthenaSoeRecalibration,
  logTriadRunEnd,
  logTriadRunStart,
  newTriadRunId,
  nowMs,
  withTriadPanelistTiming,
} from "./triad-monitor";
import {
  computeTriadGovernance,
  PANELIST_ALCHEMIST_CODENAME,
} from "./triad-panel-governance";
import {
  buildValidationSummary,
  candidatePassesAdversarial,
  candidatePassesDistributionGate,
  consensusValidateCandidate,
  filterConsensusValid,
  filterValid,
  STATUS_NOISY,
} from "./validate";
import { validateTriadIntent } from "./intent-hardener";
import {
  InfluenceAjiStatus,
  InfluenceStatus,
  InfluenceTriadMode,
  LearningStatus,
  logDegradedFallback,
  PriorsStatus,
} from "./integrity";

export type {
  InfluenceAjiStatus,
  InfluenceStatus,
  InfluenceTriadMode,
  LearningStatus,
  PriorsStatus,
};
import { lookupTablebaseCandidate } from "./reliability/checkers-fusion";

import { scoreCandidatesWithGate, type ScoreCandidatesOptions } from "./score";
import { evaluatePnhContext, pnhContextFragilityScore } from "./pnh/pnh-context-evaluator";
import type { PnhContextInput } from "./pnh/pnh-context-types";
import { logEvent } from "./telemetry";
import { generateDecisionReceipt } from "./explainability/decision-receipt";
import { CandidatePipelineState, finalizeCandidates } from "./candidate-finalizer";
import {
  buildTriadPromptWithContrastConstraint,
  recordTriadConstraintFeedback,
} from "./triad-constraint-injection";
import { computePlfDecision } from "./power-logic-fusion";
import { selectCreativeStance } from "./creative-diversity-layer";
import { evaluateProbeResult } from "./probe-intelligence-layer";
import { registerOneSeventeenRun } from "./one-seventeen-skills";
import { resolveTransmutation } from "./transmutation/transmutation-runner-logic";
import { TRANSMUTATION_BOUNDS } from "./transmutation/transmutation-bounds";
import type { TransmutationProfile } from "./transmutation/transmutation-types";
import { effectivePanelistWeight } from "./score";
import { isValidCandidate } from "./validate";

/** 
 * Robust hardening for panelist outputs: 
 * - Discard invalid candidates (Gate integrity: strict schema + param integrity).
 * - Limit candidate count (MAX_CANDIDATES).
 * - Ensure all candidates are from the correct panelist.
 */
function hardenPanelistCandidates(
  panelist: Panelist,
  candidates: unknown,
): AICandidate[] {
  if (!Array.isArray(candidates)) return [];
  const valid: AICandidate[] = [];
  for (const c of candidates) {
    if (valid.length >= MAX_CANDIDATES) break;
    if (isValidCandidate(c as AICandidate)) {
      const typed = c as AICandidate;
      if (typed.panelist === panelist) {
        valid.push(typed);
      }
    }
  }
  return valid;
}

export type AjiTriggerReason = "schism_detected" | "soe_stressed" | "heavy_gate_drop";

export interface AjiState {
  expiresAtUtc: string;
}

const activeAjiSessions = new Map<string, AjiState>();

export interface AjiInsights {
  summary: string;
  observations: string[];
  hypotheses: string[];
  suggestions: string[];
}

export function generateAjiInsight(triggerReason: AjiTriggerReason): AjiInsights {
  return {
    summary: `Mock insight for ${triggerReason}`,
    observations: ["Mock observation"],
    hypotheses: ["Mock hypothesis"],
    suggestions: ["Mock suggestion"]
  };
}

export function checkAndActivateAji(
  triadSessionId: string,
  triggerReason?: AjiTriggerReason
): boolean {
  if (!triggerReason) return false;
  
  const existing = activeAjiSessions.get(triadSessionId);
  if (existing) {
    const expired = new Date(existing.expiresAtUtc).getTime() <= nowMs();
    if (expired) {
      activeAjiSessions.delete(triadSessionId);
    } else {
      return false; // Already active, max 1 per session
    }
  }

  const expiresAtMs = nowMs() + 10 * 60 * 1000;
  const expiresAtUtc = new Date(expiresAtMs).toISOString();
  if (!expiresAtUtc || isNaN(new Date(expiresAtUtc).getTime())) {
    throw new Error("Invalid Aji expiresAtUtc at creation time");
  }

  activeAjiSessions.set(triadSessionId, { expiresAtUtc });
  
  const insight = generateAjiInsight(triggerReason);
  const insightsCount = insight.observations.length + insight.hypotheses.length + insight.suggestions.length;
  
  logEvent("aji_activation", {
    sessionId: triadSessionId,
    triggerReason,
    expiresAtUtc,
    insightsCount,
    note: "Aji single activation per session"
  });
  
  return true;
}

export const TRIAD_PANELISTS: Panelist[] = ["LLAMA", "DEEPSEEK", "QWEN"];

/** Panelist chunks from `withTriadPanelistTiming`: each candidate inherits that call's `durationMs`. */
export type TriadPanelistChunk = { 
  value: AICandidate[]; 
  durationMs: number;
  retryCount?: number;
  retryExhausted?: boolean;
  tokenUsage?: TokenUsageMetrics | null;
};

/**
 * Flatten triad panel results preserving order (LLAMA → DEEPSEEK → QWEN) and align per-candidate
 * `durationMs` without mutating `AICandidate` (parallel array for `scoreCandidatesWithGate`).
 */
export function flattenTriadChunksWithDurations(chunks: readonly TriadPanelistChunk[]): {
  candidates: AICandidate[];
  panelDurationsMs: number[];
} {
  const candidates = chunks.flatMap((c) => c.value);
  const panelDurationsMs = chunks.flatMap((c) => c.value.map(() => c.durationMs));
  return { candidates, panelDurationsMs };
}

/**
 * Gatekeeper + Slavic scoring. Temporal array must match `raw.length` or it is ignored (score-only).
 * If temporal gate yields `STATUS_NOISY`, retry once score-only (stubs & sub-200ms panelists).
 */
type TriadPanelChunk = {
  panelist: Panelist;
  value: AICandidate[];
  durationMs: number;
  failed: boolean;
  creativeStanceApplied: boolean;
  retryCount?: number;
  retryExhausted?: boolean;
  tokenUsage?: TokenUsageMetrics | null;
};

const TRIAD_EARLY_RESOLVE_DEFAULT_FLOOR = 0.9;
const TRIAD_FAST_RESOLVE_DEFAULT_FLOOR = 0.85;

/**
 * Fetcher path: optionally resolve after **two** panelists produce gate-passing candidates with scores
 * at or above **`scoreFloor`** (Slavic/Undercover applied via **`scoreGatedTriadPool`** on the partial pool).
 * Remaining panelist fetch is aborted for latency — parity becomes **mixed** (observability only; no gate mutation).
 */
async function runFetcherChunksWithOptionalEarlyTwo(
  runId: string,
  prompt: string,
  fetcher: (
    prompt: string,
    panelist: Panelist,
    signal: AbortSignal,
    ctx?: TriadFetcherContext,
  ) => Promise<AICandidate[] | { candidates: AICandidate[]; retryCount?: number; retryExhausted?: boolean; tokenUsage?: TokenUsageMetrics | null }>,
  parentSignal: AbortSignal | undefined,
  scoreOpts: ScoreCandidatesOptions,
  early: { enabled: boolean; scoreFloor: number }
): Promise<{ chunks: TriadPanelChunk[]; earlyResolvedTwo: boolean; lateJoinerPanelist?: Panelist }> {
  const controllers = TRIAD_PANELISTS.map(() => new AbortController());
  if (parentSignal) {
    parentSignal.addEventListener(
      "abort",
      () => {
        for (const c of controllers) c.abort();
      },
      { once: true }
    );
  }

  const withTimeout = <T>(p: Promise<T>, ms: number): Promise<T> => {
    return Promise.race([
      p,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
      ),
    ]);
  };

  const runOne = async (panelist: Panelist, i: number): Promise<TriadPanelChunk> => {
    const panelClientTimeoutMs = TRIAD_PANELIST_CLIENT_TIMEOUT_MS[panelist];
    const contrast = buildTriadPromptWithContrastConstraint(prompt, panelist, { enabled: true });
    const cdl = selectCreativeStance(prompt, panelist);
    const prompted =
      contrast.prompt +
      (cdl.applied && cdl.instruction ? `\n\n[AIOM_CDL_STANCE] ${cdl.instruction}` : "");
    if (contrast.applied) {
      logEvent("triad_contrast_constraint_injected", {
        runId,
        panelist,
        recentDropRate: contrast.dropRate,
        note: "Upstream contrast constraint injected for diversity pressure (Stealth Quest principle).",
      });
    }
    if (cdl.applied && cdl.stance) {
      logEvent("creative_stance_applied", {
        runId,
        panelist,
        stance: cdl.stance,
        promptHash: cdl.promptHash,
      });
    }
    try {
      const rawResult = await withTriadPanelistTiming(runId, panelist, () =>
        withTimeout(
          fetcher(prompted, panelist, controllers[i].signal, { triadSessionId: runId }),
          panelClientTimeoutMs
        )
      );
      const rawValue = Array.isArray(rawResult.value) ? rawResult.value : rawResult.value.candidates;
      const value = hardenPanelistCandidates(panelist, rawValue);
      const retryCount = Array.isArray(rawResult.value) ? 0 : rawResult.value.retryCount;
      const retryExhausted = Array.isArray(rawResult.value) ? false : rawResult.value.retryExhausted;
      const tokenUsage = Array.isArray(rawResult.value) ? null : (rawResult.value.tokenUsage ?? null);

      return {
        panelist,
        value,
        durationMs: rawResult.durationMs,
        failed: false,
        creativeStanceApplied: cdl.applied,
        retryCount,
        retryExhausted,
        tokenUsage,
      };
    } catch {
      return {
        panelist,
        value: [] as AICandidate[],
        durationMs: panelClientTimeoutMs,
        failed: true,
        creativeStanceApplied: cdl.applied,
      };
    }
  };

  const taskPromises = TRIAD_PANELISTS.map((panelist, i) =>
    runOne(panelist, i).then((chunk) => ({ index: i, chunk }))
  );

  if (!early.enabled) {
    const results = await Promise.all(taskPromises);
    return {
      chunks: results.map((r) => r.chunk),
      earlyResolvedTwo: false,
    };
  }

  const indices = new Set([0, 1, 2]);
  const completedOrder: TriadPanelChunk[] = [];
  let earlyResolvedTwo = false;
  let lateJoinerPanelist: Panelist | undefined;

  while (indices.size > 0) {
    const { index, chunk } = await Promise.race(
      Array.from(indices).map(
        (i) => taskPromises[i] as Promise<{ index: number; chunk: TriadPanelChunk }>
      )
    );
    indices.delete(index);
    completedOrder.push(chunk);

    if (completedOrder.length === 2) {
      const flat = flattenTriadChunksWithDurations(
        completedOrder.map((c) => ({ 
          value: c.value, 
          durationMs: c.durationMs,
          retryCount: c.retryCount,
          retryExhausted: c.retryExhausted,
          tokenUsage: c.tokenUsage,
        }))
      );
      const scoringLane = scoreOpts.pnhScoringLane ?? "fully_live";
      const pTrim = prompt.trim();
      const intentOk =
        pTrim.length === 0 ||
        validateTriadIntent({ prompt: pTrim }, { pnhTriadLane: scoringLane }).ok;

      const scored = scoreGatedTriadPool(
        flat.candidates,
        prompt,
        flat.panelDurationsMs,
        scoreOpts
      );
      const high = scored.filter((c) => c.score >= early.scoreFloor);
      const panelistsPostSlavic = new Set(high.map((c) => c.panelist));

      /** Pre-Slavic: parallel param vectors + identical reasoning can cosine-dedupe across panelists. */
      const validPre = filterValid(flat.candidates);
      const highPre = validPre.filter((c) => c.score >= early.scoreFloor);
      const panelistsPreSlavic = new Set(highPre.map((c) => c.panelist));

      if (
        intentOk &&
        (panelistsPostSlavic.size >= 2 || panelistsPreSlavic.size >= 2)
      ) {
        const lateIndex = Array.from(indices)[0];
        lateJoinerPanelist = lateIndex != null ? TRIAD_PANELISTS[lateIndex] : undefined;
        for (const i of Array.from(indices)) controllers[i].abort();
        earlyResolvedTwo = true;
        logEvent("triad_fast_path_resolved", {
          runId,
          scoreFloor: early.scoreFloor,
          late_joiner: lateJoinerPanelist ?? "unknown",
          mode: "partial_high_confidence",
          confidence_class: "provisional",
          note: "Resolved triad after two high-confidence panelists; remaining panelist marked late_joiner",
        });
        logEvent("triad_early_resolve_two", {
          runId,
          scoreFloor: early.scoreFloor,
          late_joiner: lateJoinerPanelist ?? "unknown",
          note:
            panelistsPostSlavic.size >= 2
              ? "Aborted remaining panelist fetch after two high-score gate-passing panelists — latency path; parity mixed"
              : "Aborted after two panelists at floor (pre-Slavic distinct; Slavic may merge parallel rows) — latency path; parity mixed",
        });
        break;
      }
    }
  }

  const settled = await Promise.allSettled(taskPromises);
  const chunks: TriadPanelChunk[] = settled.map((s, i) => {
    if (s.status === "fulfilled") return s.value.chunk;
    return {
      panelist: TRIAD_PANELISTS[i],
      value: [] as AICandidate[],
      durationMs: TRIAD_PANELIST_CLIENT_TIMEOUT_MS[TRIAD_PANELISTS[i]],
      failed: true,
      creativeStanceApplied: false,
    };
  });

  return { chunks, earlyResolvedTwo, lateJoinerPanelist };
}

function buildTriadParityFields(
  triadRunMode: "tablebase" | "fetcher" | "stub",
  panelChunks: TriadPanelChunk[] | null
): {
  triadParityMode: TriadParityMode;
  triadDegraded: boolean;
  triadPanelOutcomes: TriadPanelistRunOutcome[] | undefined;
} {
  if (triadRunMode === "tablebase") {
    return { triadParityMode: "tablebase", triadDegraded: false, triadPanelOutcomes: undefined };
  }
  const outcomes: TriadPanelistRunOutcome[] | undefined =
    panelChunks === null
      ? undefined
      : panelChunks.map((c) => ({
          panelist: c.panelist,
          candidateCount: c.value.length,
          failed: c.failed,
          durationMs: Math.round(c.durationMs),
          retryCount: c.retryCount,
          retryExhausted: c.retryExhausted,
          tokenUsage: c.tokenUsage,
        }));
  if (triadRunMode === "stub") {
    return {
      triadParityMode: "stub",
      triadDegraded: false,
      triadPanelOutcomes: outcomes ?? [],
    };
  }
  const fully =
    outcomes !== undefined &&
    outcomes.length === TRIAD_PANELISTS.length &&
    outcomes.every((o) => !o.failed && o.candidateCount > 0);
  return {
    triadParityMode: fully ? "fully_live" : "mixed",
    triadDegraded: !fully,
    triadPanelOutcomes: outcomes,
  };
}

function pnhTriadLaneClassFromClientRun(
  triadRunMode: "tablebase" | "fetcher" | "stub",
  parityMode: TriadParityMode
): "stub" | "mixed" | "fully_live" | "tablebase" {
  if (triadRunMode === "stub") return "stub";
  if (triadRunMode === "tablebase") return "tablebase";
  return parityMode === "fully_live" ? "fully_live" : "mixed";
}

function scoreGatedTriadPool(
  raw: AICandidate[],
  prompt: string,
  panelDurationsMs: number[] | undefined,
  scoreOptions?: ScoreCandidatesOptions
): AICandidate[] {
  if (raw.length === 0) return [];
  const useTemporal =
    panelDurationsMs != null &&
    panelDurationsMs.length === raw.length &&
    panelDurationsMs.length > 0;

  const first = scoreCandidatesWithGate(
    raw,
    prompt,
    useTemporal ? panelDurationsMs : undefined,
    scoreOptions
  );
  if (first.status !== STATUS_NOISY) return first.candidates;
  if (useTemporal) {
    logDegradedFallback("temporal_gate_noisy_retry_score_only", {
      module: "triad.scoreGatedTriadPool",
      rawCount: raw.length,
    });
    return scoreCandidatesWithGate(raw, prompt, undefined, scoreOptions).candidates;
  }
  return [];
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

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(t);
      reject(new Error("Triad aborted"));
    });
  });
}

/** Synthetic params so Undercover + Slavic paths run on stubs (cosine < SLAVIC threshold vs B). */
const STUB_PARAM_ARRAY_A: number[] = Array.from({ length: 16 }, (_, i) => 0.25 + i * 0.028);
const STUB_PARAM_ARRAY_B: number[] = Array.from(
  { length: 16 },
  (_, i) => 0.5 + 0.18 * Math.sin((i * Math.PI) / 8)
);

/**
 * Stub candidates for a single panelist (`makeTriadFetcher(true)` / Storybook only).
 * API routes use live providers or 503 `triad_unconfigured` when keys are missing.
 */
export async function stubPanelistCandidates(
  _prompt: string,
  panelist: Panelist,
  signal?: AbortSignal
): Promise<AICandidate[]> {
  await sleep(50, signal);
  return [
    {
      state: emptyState(),
      score: 0.5,
      reasoning: `Stub A from ${PANELIST_ALCHEMIST_CODENAME[panelist]}. Wire real API (8s timeout) here.`,
      panelist,
      paramArray: STUB_PARAM_ARRAY_A,
    },
    {
      state: emptyState(),
      score: 0.55,
      reasoning: `Stub B alternate row from ${PANELIST_ALCHEMIST_CODENAME[panelist]} — second stub vector for Slavic dedupe tests.`,
      panelist,
      paramArray: STUB_PARAM_ARRAY_B,
    },
  ];
}

const PANELIST_TO_SLUG: Record<Panelist, string> = {
  LLAMA: "llama",
  DEEPSEEK: "deepseek",
  QWEN: "qwen",
};

/** Passed as 4th argument to triad fetchers — correlates panelist HTTP calls with `runTriad`’s `runId`. */
export type TriadFetcherContext = {
  triadSessionId: string;
};

/**
 * Build a triad fetcher for `runTriad`.
 * - `demo === true`: in-process stubs (no HTTP; for Storybook / offline).
 * - `demo === false`: POST `{ prompt, triadSessionId? }` to `${baseUrl}/api/triad/<slug>` (App Router panelist routes).
 */
export function makeTriadFetcher(
  demo: boolean,
  baseUrl = "",
  postOpts?: { userMode?: UserMode; triadSessionId?: string }
): (
  prompt: string, 
  panelist: Panelist, 
  signal: AbortSignal, 
  ctx?: TriadFetcherContext
) => Promise<AICandidate[] | { candidates: AICandidate[]; retryCount?: number; retryExhausted?: boolean; tokenUsage?: TokenUsageMetrics | null }> {
  if (demo) {
    return (prompt, panelist, signal, _ctx) => stubPanelistCandidates(prompt, panelist, signal);
  }
  const root = baseUrl.replace(/\/$/, "");
  return async (prompt, panelist, signal, ctx) => {
    const slug = PANELIST_TO_SLUG[panelist];
    const url = `${root}/api/triad/${slug}`;
    const session = ctx?.triadSessionId ?? postOpts?.triadSessionId;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        ...(postOpts?.userMode !== undefined ? { userMode: postOpts.userMode } : {}),
        ...(session !== undefined && session.length > 0 ? { triadSessionId: session } : {}),
      }),
      signal,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `Triad ${PANELIST_ALCHEMIST_CODENAME[panelist]} failed: ${res.status} ${text}`
      );
    }
    const data = (await res.json()) as { 
      candidates?: AICandidate[];
      retryCount?: number;
      retryExhausted?: boolean;
    };
    if (!data.candidates || !Array.isArray(data.candidates)) {
      throw new Error(`Triad ${PANELIST_ALCHEMIST_CODENAME[panelist]}: invalid response shape`);
    }
    return {
      candidates: data.candidates,
      retryCount: data.retryCount,
      retryExhausted: data.retryExhausted,
    };
  };
}

/**
 * Run the AI Triad: produce up to MAX_CANDIDATES candidates.
 * Uses stub by default; inject real fetcher for production.
 * 8s timeout per panelist; fail loudly on timeout or error.
 */
export async function runTriad(
  prompt: string,
  options?: {
    signal?: AbortSignal;
    /** Override: custom fetcher (e.g. serverless route). If not set, stub is used. Receives `triadSessionId` in 4th arg (same as internal `runId`). */
    fetcher?: (
      prompt: string,
      panelist: Panelist,
      signal: AbortSignal,
      ctx?: TriadFetcherContext,
    ) => Promise<AICandidate[] | { candidates: AICandidate[]; retryCount?: number; retryExhausted?: boolean; tokenUsage?: TokenUsageMetrics | null }>;
    /** Run consensus validator on each candidate (param range [0,1]); set analysis.validationSummary. */
    runConsensusValidation?: boolean;
    /** When true, exclude candidates that fail consensus (param out-of-range). Default false. */
    useConsensusFilter?: boolean;
    /** Skip keyword tablebase short-circuit (tests / explicit triad-only runs). */
    skipTablebase?: boolean;
    /** Forward to **`scoreCandidates`** intent alignment + optional triad POST body via **`makeTriadFetcher(..., postOpts)`**. */
    userMode?: UserMode;
    /**
     * When **`true`** with a fetcher: throw if any panelist failed or returned zero candidates
     * (**`triadParityMode !== "fully_live"`**). Ignored for stub / tablebase.
     */
    throwIfTriadNotFullyLive?: boolean;
    /**
     * Skip PNH prompt defense + response echo audit — **tests / harness only**; default **`false`**.
     */
    skipPnhTriadDefense?: boolean;
    /** Intent lane for **`validateTriadIntent`** (default **`fully_live`** — strict). */
    pnhIntentGuardLane?: PnhTriadLane;
    /** When **`false`**, do not attempt jailbreak marker strip + re-validate. Default **`true`**. */
    pnhAllowPromptSanitize?: boolean;
    /**
     * Fetcher path only: if two panelists return gate-passing candidates with scores ≥ floor, abort the
     * remaining upstream fetch for lower latency (parity **mixed**). Default **off**.
     */
    triadEarlyResolveTwo?: boolean;
    /** Alias for **`triadEarlyResolveTwo`** with default floor **0.85** when floor not provided. */
    fastResolve?: boolean;
    /** Default **0.9** when **`triadEarlyResolveTwo`** is enabled. */
    triadEarlyResolveScoreFloor?: number;
    /** Aji enforcement lock: trigger check. */
    ajiTrigger?: AjiTriggerReason;
    /** Override internal runId for Aji tests. */
    triadSessionIdOverride?: string;
    /** Optional callback for token usage recording (e.g. for Node-side persist). */
    onTokenUsage?: (params: { actual: Record<Panelist, TokenUsageMetrics | null>, baseline: Record<Panelist, number> }) => void;
  }
): Promise<AIAnalysis> {
  const skipPnh = options?.skipPnhTriadDefense === true;
  let promptInterventions: PnhTriadIntervention[] = [];
  let originalPromptHash = hashPromptForTelemetry(prompt);
  let executionPromptHash = originalPromptHash;

  if (!skipPnh) {
    const lane: PnhTriadLane = options?.pnhIntentGuardLane ?? "fully_live";
    const defense = applyPnhTriadPromptDefense(
      { prompt, userMode: options?.userMode },
      {
        pnhTriadLane: lane,
        allowSanitizeRecover: options?.pnhAllowPromptSanitize !== false,
      },
    );
    prompt = defense.prompt;
    promptInterventions = defense.interventions;
    originalPromptHash = defense.originalPromptHash;
    executionPromptHash = defense.executionPromptHash;
    if (!defense.ok) {
      throw new Error(`Prompt rejected: ${defense.blockedReason ?? "intent_guard"}`);
    }
  } else {
    const pg = validatePromptForTriad(prompt);
    if (pg.ok === false) {
      throw new Error(`Prompt rejected: ${pg.reason}`);
    }
  }

  const signal = options?.signal;
  const fetcher = options?.fetcher;
  const runConsensus = options?.runConsensusValidation === true;
  const useConsensusFilter = options?.useConsensusFilter === true;

  const runId = options?.triadSessionIdOverride ?? newTriadRunId();
  const tRun0 = nowMs();

  // Phase 2: Resolve Transmutation early (fail-open)
  let transmutationProfile: TransmutationProfile | null = null;
  let transmutationStatus: "applied" | "fallback_baseline" | "disabled" = "applied";
  let transmutationPolicyFamily: string | undefined;
  let transmutationConfidence: number | undefined;
  let transmutationTaskType: string | undefined;
  let transmutationFallbackReason: string | undefined;
  let boundsTriggered: string[] = [];

  try {
    const res = resolveTransmutation(prompt);
    transmutationProfile = res.transmutation_profile;
    transmutationPolicyFamily = res.audit_trace.policy_family;
    transmutationConfidence = res.confidence;
    transmutationTaskType = res.audit_trace.policy_family; // or task_type if available
    boundsTriggered = res.audit_trace.bounds_checks;
    if (res.fallback_used) {
      transmutationStatus = "fallback_baseline";
      transmutationFallbackReason = res.audit_trace.reasons.join(", ");
    }
    
    logEvent("transmutation_resolved", {
      runId,
      status: transmutationStatus,
      policyFamily: transmutationPolicyFamily,
      confidence: transmutationConfidence,
      boundsTriggered,
      fallbackReason: transmutationFallbackReason,
      note: "Lane A: Transmutation Phase 2 advisory resolution complete."
    });
  } catch (err) {
    transmutationStatus = "fallback_baseline";
    transmutationFallbackReason = err instanceof Error ? err.message : "resolution_error";
  }

  // Explicit Aji trigger check at the very start of runTriad
  if (options?.ajiTrigger) {
    checkAndActivateAji(runId, options.ajiTrigger);
  }

  const tablebaseCandidate =
    options?.skipTablebase === true ? null : lookupTablebaseCandidate(prompt, runId);
  const triadRunMode = tablebaseCandidate
    ? "tablebase"
    : fetcher
      ? "fetcher"
      : "stub";

  logTriadRunStart(runId, {
    promptLen: prompt.length,
    mode: triadRunMode,
  });

  let candidates: AICandidate[];
  let meanPanelistMs = 0;
  let triadFailureRate = 0;
  /** Parallel to `candidates` when built from panelist chunks; omitted for tablebase. */
  let panelDurationsMs: number[] | undefined;
  /** Per-panel rows for parity telemetry; null for tablebase. */
  let panelChunks: TriadPanelChunk[] | null = null;
  let triadEarlyResolvedTwo = false;
  let triadLateJoinerPanelist: Panelist | undefined;

  if (tablebaseCandidate) {
    candidates = [tablebaseCandidate];
    meanPanelistMs = 0;
    triadFailureRate = 0;
    panelDurationsMs = undefined;
    panelChunks = null;
  } else if (fetcher) {
    const scoringLaneForFetch: PnhTriadLane = triadRunMode === "stub" ? "stub" : "fully_live";
    const scoreOptsForFetch: ScoreCandidatesOptions = {
      ...(options?.userMode !== undefined ? { userMode: options.userMode } : {}),
      pnhScoringLane: scoringLaneForFetch,
      transmutationProfile,
    };
    const earlyEnabled = options?.triadEarlyResolveTwo === true || options?.fastResolve === true;
    const earlyFloor =
      options?.triadEarlyResolveScoreFloor ??
      (options?.fastResolve === true
        ? TRIAD_FAST_RESOLVE_DEFAULT_FLOOR
        : TRIAD_EARLY_RESOLVE_DEFAULT_FLOOR);
    const { chunks, earlyResolvedTwo, lateJoinerPanelist } = await runFetcherChunksWithOptionalEarlyTwo(
      runId,
      prompt,
      fetcher,
      signal,
      scoreOptsForFetch,
      {
        enabled: earlyEnabled,
        scoreFloor: earlyFloor,
      }
    );
    triadEarlyResolvedTwo = earlyResolvedTwo;
    triadLateJoinerPanelist = lateJoinerPanelist;
    panelChunks = chunks.map((c) => ({
      panelist: c.panelist,
      value: c.value,
      durationMs: c.durationMs,
      failed: c.failed,
      creativeStanceApplied: c.creativeStanceApplied,
    }));
    const flat = flattenTriadChunksWithDurations(
      chunks.map((c) => ({ value: c.value, durationMs: c.durationMs }))
    );
    candidates = flat.candidates;
    panelDurationsMs = flat.panelDurationsMs;
    meanPanelistMs =
      chunks.reduce((a, c) => a + c.durationMs, 0) / Math.max(chunks.length, 1);
    triadFailureRate =
      chunks.filter((c) => c.failed || c.value.length === 0).length / Math.max(chunks.length, 1);
  } else {
    const chunks = await Promise.all(
      TRIAD_PANELISTS.map(async (panelist) => {
        const { value: rawValue, durationMs } = await withTriadPanelistTiming(runId, panelist, () =>
          stubPanelistCandidates(prompt, panelist, signal)
        );
        const value = hardenPanelistCandidates(panelist, rawValue);
        return {
          panelist,
          value,
          durationMs,
          failed: false as const,
          creativeStanceApplied: false,
        };
      })
    );
    panelChunks = chunks.map((c) => ({
      panelist: c.panelist,
      value: c.value,
      durationMs: c.durationMs,
      failed: c.failed,
      creativeStanceApplied: c.creativeStanceApplied,
    }));
    const flat = flattenTriadChunksWithDurations(
      chunks.map((c) => ({ value: c.value, durationMs: c.durationMs }))
    );
    candidates = flat.candidates;
    panelDurationsMs = flat.panelDurationsMs;
    meanPanelistMs =
      chunks.reduce((a, c) => a + c.durationMs, 0) / Math.max(chunks.length, 1);
    triadFailureRate = 0;
  }

  let responseInterventions: PnhTriadIntervention[] = [];
  if (!skipPnh && candidates.length > 0) {
    const audited = auditTriadCandidatesForPnhResponseEcho(candidates, { runId });
    candidates = audited.candidates;
    responseInterventions = audited.interventions;
  }

  const parity = buildTriadParityFields(triadRunMode, panelChunks);

  const scoringLaneForPool: PnhTriadLane = triadRunMode === "stub" ? "stub" : "fully_live";
  const scoreOpts: ScoreCandidatesOptions = {
    ...(options?.userMode !== undefined ? { userMode: options.userMode } : {}),
    pnhScoringLane: scoringLaneForPool,
    transmutationProfile,
  };
  const scored = scoreGatedTriadPool(candidates, prompt, panelDurationsMs, scoreOpts);

  const pipelineStates: CandidatePipelineState[] = scored.map((c, idx) => ({
    raw: c,
    repaired: c,
    final: c,
    provenance: {
      repairedAt: "none",
      scoredBy: "combined",
      panelist: c.panelist,
      revision: idx + 1,
    },
  }));

  let valid = finalizeCandidates(pipelineStates, {
    scoreFloor: 0,
    maxCandidates: MAX_CANDIDATES,
    predicate: (c) => candidatePassesDistributionGate(c) && candidatePassesAdversarial(c, prompt),
  });

  let validationSummary: string | undefined;
  if (runConsensus) {
    const results = valid.map((c: AICandidate) => consensusValidateCandidate(c));
    validationSummary = buildValidationSummary(valid, results);
    if (useConsensusFilter) {
      valid = filterConsensusValid(valid).slice(0, MAX_CANDIDATES);
    }
  }

  const gateDropRate =
    candidates.length > 0
      ? Math.min(1, Math.max(0, 1 - valid.length / candidates.length))
      : 0;
  recordTriadConstraintFeedback(valid[0] ?? null, gateDropRate);
  const governance = computeTriadGovernance({
    meanPanelistMs,
    triadFailureRate,
    gateDropRate,
  });
  if (governance.athenaSoeRecalibrationRecommended) {
    logAthenaSoeRecalibration({
      runId,
      healthScore: governance.healthScore,
      ...governance.scores,
    });
  }
  logTriadRunEnd(runId, nowMs() - tRun0, {
    mode: triadRunMode,
    rawCandidateCount: candidates.length,
    afterGateCount: valid.length,
    triadHealthScore: governance.healthScore,
    triadGovernanceScores: governance.scores,
    triadParityMode: parity.triadParityMode,
    triadDegraded: parity.triadDegraded,
    triadSessionId: runId,
  });

  if (options?.throwIfTriadNotFullyLive === true && triadRunMode === "fetcher") {
    if (parity.triadParityMode !== "fully_live") {
      throw new Error(
        `Triad strict full-live enforced: triadParityMode=${parity.triadParityMode} — expected fully_live (three panelists, each with ≥1 candidate, no failures)`
      );
    }
  }

  const pnhInput: PnhContextInput = {
    triadParityMode: parity.triadParityMode,
    triadFullyLive: parity.triadParityMode === "fully_live",
  };
  const pnhEval = evaluatePnhContext(pnhInput);
  const frag01 = pnhContextFragilityScore(pnhInput);

  const mergedPnh = [...promptInterventions, ...responseInterventions];
  const pnhInterventionTypes = Array.from(new Set(mergedPnh.map((i) => i.type)));
  const plf = computePlfDecision(
    {
      gateDropRate,
      triadFailureRate,
      pnhInterventionCount: mergedPnh.length,
      candidateCount: valid.length,
    },
    (valid[0]?.intentAlignmentScore ?? 0.5) >= 0.5
  );
  logEvent("plf_decision", {
    runId,
    confidence: plf.confidence,
    probe: plf.probe,
    classification: plf.classification,
    candidateCount: valid.length,
  });
  const probeResult = evaluateProbeResult({
    signal: plf.probe,
    candidates: valid,
    triadFailureRate,
    gateDropRate,
  });
  logEvent("probe_intelligence_result", {
    runId,
    signal: probeResult.signal,
    responseQuality: Number(probeResult.responseQuality.toFixed(3)),
    classification: probeResult.classification,
  });
  const oneSeventeen = registerOneSeventeenRun({
    prompt,
    panelistAnchor: TRIAD_PANELISTS[0],
    panelistCalls: panelChunks?.length ?? 0,
    candidatesScored: candidates.length,
    creativeStancesApplied: panelChunks?.filter((c) => c.creativeStanceApplied).length ?? 0,
    redZoneChecks: valid.length,
  });
  if (oneSeventeen.initiationTriggered) {
    logEvent("one_seventeen_initiation", {
      runId,
      trigger: oneSeventeen.triggerTag,
      message: oneSeventeen.message,
      spirit: oneSeventeen.oneSeventeen.spirit,
      pace: oneSeventeen.oneSeventeen.pace,
    });
  }
  const pnhTriadDefense =
    !skipPnh && pnhInterventionTypes.length > 0
      ? {
          pnhIntervention: true,
          pnhInterventionTypes,
          originalPromptHash,
          executionPromptHash,
        }
      : !skipPnh
        ? {
            pnhIntervention: false,
            pnhInterventionTypes: [] as string[],
            originalPromptHash,
            executionPromptHash,
          }
        : undefined;

  const triadExecutionPrompt =
    !skipPnh && originalPromptHash !== executionPromptHash ? prompt : undefined;

  return {
    candidates: valid,
      decisionReceipt: generateDecisionReceipt(
      {
        candidates: valid,
        triadRunTelemetry: {
          meanPanelistMs,
          triadFailureRate,
          gateDropRate,
          triadRunMode,
          rawCandidateCount: candidates.length,
          afterGateCount: valid.length,
          triadParityMode: parity.triadParityMode,
          triadDegraded: parity.triadDegraded,
          triadPanelOutcomes: parity.triadPanelOutcomes,
          triadSessionId: runId,
          pnhContextSurface: {
            triadLaneClass: pnhTriadLaneClassFromClientRun(triadRunMode, parity.triadParityMode),
            riskLevel: pnhEval.riskLevel,
            environment: pnhEval.environment,
            fragilityScore01: frag01,
          },
          plf,
          probeIntelligence: probeResult,
          oneSeventeen: oneSeventeen.oneSeventeen,
          ...(pnhTriadDefense !== undefined && { pnhTriadDefense }),
          ...(triadEarlyResolvedTwo
            ? {
                triadFastPathResolved: true,
                triadEarlyResolveTwo: true,
                triadEarlyResolveScoreFloor:
                  options?.triadEarlyResolveScoreFloor ??
                  (options?.fastResolve === true
                    ? TRIAD_FAST_RESOLVE_DEFAULT_FLOOR
                    : TRIAD_EARLY_RESOLVE_DEFAULT_FLOOR),
                ...(triadLateJoinerPanelist !== undefined && {
                  triadLateJoinerPanelist,
                }),
              }
            : {}),
          transmutation: {
            status: transmutationStatus,
            policyFamily: transmutationPolicyFamily,
            confidence: transmutationConfidence,
            taskType: transmutationTaskType,
            effective: {
              triadWeights: transmutationProfile?.triad_weights
                ? (Object.fromEntries(
                    TRIAD_PANELISTS.map((p) => [
                      p,
                      effectivePanelistWeight({ panelist: p } as AICandidate, transmutationProfile),
                    ])
                  ) as Record<string, number>)
                : undefined,
              slavicThresholdDelta: transmutationProfile
                ? Math.max(
                    -TRANSMUTATION_BOUNDS.single_threshold_delta_max,
                    Math.min(
                      TRANSMUTATION_BOUNDS.single_threshold_delta_max,
                      transmutationProfile.gate_offsets.slavic_threshold_delta
                    )
                  )
                : undefined,
              tasteWeight: transmutationProfile?.priors.taste_weight,
            },
            fallbackReason: transmutationFallbackReason,
            boundsTriggered: boundsTriggered.length > 0 ? boundsTriggered : undefined,
          },
        },
      },
      valid,
      {
        stubUsage: triadRunMode === "stub",
      }
    ),
    triadRunTelemetry: {
      meanPanelistMs,
      triadFailureRate,
      gateDropRate,
      triadRunMode,
      rawCandidateCount: candidates.length,
      afterGateCount: valid.length,
      triadParityMode: parity.triadParityMode,
      triadDegraded: parity.triadDegraded,
      triadPanelOutcomes: parity.triadPanelOutcomes,
      triadSessionId: runId,
      pnhContextSurface: {
        triadLaneClass: pnhTriadLaneClassFromClientRun(triadRunMode, parity.triadParityMode),
        riskLevel: pnhEval.riskLevel,
        environment: pnhEval.environment,
        fragilityScore01: frag01,
      },
      plf,
      probeIntelligence: probeResult,
      oneSeventeen: oneSeventeen.oneSeventeen,
      ...(pnhTriadDefense !== undefined && { pnhTriadDefense }),
      ...(triadEarlyResolvedTwo
        ? {
            triadFastPathResolved: true,
            triadEarlyResolveTwo: true,
            triadEarlyResolveScoreFloor:
              options?.triadEarlyResolveScoreFloor ??
              (options?.fastResolve === true
                ? TRIAD_FAST_RESOLVE_DEFAULT_FLOOR
                : TRIAD_EARLY_RESOLVE_DEFAULT_FLOOR),
            ...(triadLateJoinerPanelist !== undefined && {
              triadLateJoinerPanelist,
            }),
          }
        : {}),
      transmutation: {
        status: transmutationStatus,
        policyFamily: transmutationPolicyFamily,
        confidence: transmutationConfidence,
        taskType: transmutationTaskType,
        effective: {
          triadWeights: transmutationProfile?.triad_weights
            ? (Object.fromEntries(
                TRIAD_PANELISTS.map((p) => [
                  p,
                  effectivePanelistWeight({ panelist: p } as AICandidate, transmutationProfile),
                ])
              ) as Record<string, number>)
            : undefined,
          slavicThresholdDelta: transmutationProfile
            ? Math.max(
                -TRANSMUTATION_BOUNDS.single_threshold_delta_max,
                Math.min(
                  TRANSMUTATION_BOUNDS.single_threshold_delta_max,
                  transmutationProfile.gate_offsets.slavic_threshold_delta
                )
              )
            : undefined,
          tasteWeight: transmutationProfile?.priors.taste_weight,
        },
        fallbackReason: transmutationFallbackReason,
        boundsTriggered: boundsTriggered.length > 0 ? boundsTriggered : undefined,
      },
      ...(() => {
        const baseline = 2500;
        const panelistBaselines: Record<Panelist, number> = {
            LLAMA: baseline,
            DEEPSEEK: baseline,
            QWEN: baseline,
        };
        const actualUsage: Record<Panelist, TokenUsageMetrics | null> = {
            LLAMA: null,
            DEEPSEEK: null,
            QWEN: null,
        };
        
        if (panelChunks) {
            panelChunks.forEach(pc => {
                if (pc.tokenUsage) {
                    actualUsage[pc.panelist] = pc.tokenUsage;
                }
            });
        }

        const totalActual: TokenUsageMetrics = {
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0,
        };

        let activeCount = 0;
        (Object.values(actualUsage) as (TokenUsageMetrics | null)[]).forEach(u => {
            if (u) {
                totalActual.promptTokens += u.promptTokens;
                totalActual.completionTokens += u.completionTokens;
                totalActual.totalTokens += u.totalTokens;
                activeCount++;
            }
        });

        const totalBaseline = TRIAD_PANELISTS.length * baseline;
        const totalSaved = Math.max(0, totalBaseline - totalActual.totalTokens);
        const savingsPercent = totalBaseline > 0 ? (totalSaved / totalBaseline) * 100 : 0;

        // Save to ledger (if callback provided — usually Node side)
        if (triadRunMode !== "stub" && activeCount > 0 && options?.onTokenUsage) {
            try {
                options.onTokenUsage({
                    actual: actualUsage,
                    baseline: panelistBaselines,
                });
            } catch (err) {
                console.error("Failed to record token usage to ledger", err);
            }
        }

        return {
            totalTokenUsage: activeCount > 0 ? totalActual : undefined,
            tokenSavings: activeCount > 0 ? {
                tokensUsed: totalActual.totalTokens,
                tokensBaseline: totalBaseline,
                tokensSaved: totalSaved,
                savingsPercent,
                baselineMode: "estimated" as const,
            } : undefined,
        };
      })(),
    },
    ...(triadExecutionPrompt !== undefined && { triadExecutionPrompt }),
    ...(validationSummary !== undefined && { validationSummary }),
  };
}
