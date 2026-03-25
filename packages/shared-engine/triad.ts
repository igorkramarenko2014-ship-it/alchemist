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
} from "./validate";
import { logDegradedFallback } from "./integrity";
import { lookupTablebaseCandidate } from "./reliability/checkers-fusion";
import { scoreCandidatesWithGate, type ScoreCandidatesOptions } from "./score";
import { STATUS_NOISY } from "./validate";
import { evaluatePnhContext, pnhContextFragilityScore } from "./pnh/pnh-context-evaluator";
import type { PnhContextInput } from "./pnh/pnh-context-types";

export const TRIAD_PANELISTS: Panelist[] = ["LLAMA", "DEEPSEEK", "QWEN"];

/** Panelist chunks from `withTriadPanelistTiming`: each candidate inherits that call's `durationMs`. */
export type TriadPanelistChunk = { value: AICandidate[]; durationMs: number };

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
};

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

/**
 * Build a triad fetcher for `runTriad`.
 * - `demo === true`: in-process stubs (no HTTP; for Storybook / offline).
 * - `demo === false`: POST `{ prompt }` to `${baseUrl}/api/triad/<slug>` (App Router panelist routes).
 */
export function makeTriadFetcher(
  demo: boolean,
  baseUrl = "",
  postOpts?: { userMode?: UserMode }
): (prompt: string, panelist: Panelist, signal: AbortSignal) => Promise<AICandidate[]> {
  if (demo) {
    return (prompt, panelist, signal) => stubPanelistCandidates(prompt, panelist, signal);
  }
  const root = baseUrl.replace(/\/$/, "");
  return async (prompt, panelist, signal) => {
    const slug = PANELIST_TO_SLUG[panelist];
    const url = `${root}/api/triad/${slug}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        ...(postOpts?.userMode !== undefined ? { userMode: postOpts.userMode } : {}),
      }),
      signal,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `Triad ${PANELIST_ALCHEMIST_CODENAME[panelist]} failed: ${res.status} ${text}`
      );
    }
    const data = (await res.json()) as { candidates?: AICandidate[] };
    if (!data.candidates || !Array.isArray(data.candidates)) {
      throw new Error(`Triad ${PANELIST_ALCHEMIST_CODENAME[panelist]}: invalid response shape`);
    }
    return data.candidates;
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
    /** Override: custom fetcher (e.g. serverless route). If not set, stub is used. */
    fetcher?: (prompt: string, panelist: Panelist, signal: AbortSignal) => Promise<AICandidate[]>;
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

  const runId = newTriadRunId();
  const tRun0 = nowMs();
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

  const withTimeout = <T>(p: Promise<T>, ms: number): Promise<T> => {
    return Promise.race([
      p,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
      ),
    ]);
  };

  let candidates: AICandidate[];
  let meanPanelistMs = 0;
  let triadFailureRate = 0;
  /** Parallel to `candidates` when built from panelist chunks; omitted for tablebase. */
  let panelDurationsMs: number[] | undefined;
  /** Per-panel rows for parity telemetry; null for tablebase. */
  let panelChunks: TriadPanelChunk[] | null = null;

  if (tablebaseCandidate) {
    candidates = [tablebaseCandidate];
    meanPanelistMs = 0;
    triadFailureRate = 0;
    panelDurationsMs = undefined;
    panelChunks = null;
  } else if (fetcher) {
    const chunks = await Promise.all(
      TRIAD_PANELISTS.map(async (panelist) => {
        const panelClientTimeoutMs = TRIAD_PANELIST_CLIENT_TIMEOUT_MS[panelist];
        const controller = new AbortController();
        const s = controller.signal;
        if (signal) signal.addEventListener("abort", () => controller.abort());
        try {
          const { value, durationMs } = await withTriadPanelistTiming(runId, panelist, () =>
            withTimeout(fetcher(prompt, panelist, s), panelClientTimeoutMs)
          );
          return {
            panelist,
            value,
            durationMs,
            failed: false as const,
          };
        } catch {
          return {
            panelist,
            value: [] as AICandidate[],
            durationMs: panelClientTimeoutMs,
            failed: true as const,
          };
        }
      })
    );
    panelChunks = chunks.map((c) => ({
      panelist: c.panelist,
      value: c.value,
      durationMs: c.durationMs,
      failed: c.failed,
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
        const { value, durationMs } = await withTriadPanelistTiming(runId, panelist, () =>
          stubPanelistCandidates(prompt, panelist, signal)
        );
        return {
          panelist,
          value,
          durationMs,
          failed: false as const,
        };
      })
    );
    panelChunks = chunks.map((c) => ({
      panelist: c.panelist,
      value: c.value,
      durationMs: c.durationMs,
      failed: c.failed,
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
  };
  const scored = scoreGatedTriadPool(candidates, prompt, panelDurationsMs, scoreOpts);

  let valid = scored
    .filter(candidatePassesDistributionGate)
    .filter((c) => candidatePassesAdversarial(c, prompt))
    .slice(0, MAX_CANDIDATES);

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
      pnhContextSurface: {
        triadLaneClass: pnhTriadLaneClassFromClientRun(triadRunMode, parity.triadParityMode),
        riskLevel: pnhEval.riskLevel,
        environment: pnhEval.environment,
        fragilityScore01: frag01,
      },
      ...(pnhTriadDefense !== undefined && { pnhTriadDefense }),
    },
    ...(triadExecutionPrompt !== undefined && { triadExecutionPrompt }),
    ...(validationSummary !== undefined && { validationSummary }),
  };
}
