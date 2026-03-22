/**
 * AI Triad: internal IDs `LLAMA` / `DEEPSEEK` / `QWEN` with blend weights in `constants`.
 * **Alchemist codenames** (Athena / Hermes / Hestia) are for UI + telemetry only.
 * 8 candidates, 8s timeout per call, fail loudly.
 */
import type { AICandidate, AIAnalysis, Panelist, SerumState } from "@alchemist/shared-types";
import { AI_TIMEOUT_MS, MAX_CANDIDATES } from "./constants";
import { validatePromptForTriad } from "./prompt-guard";
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
} from "./validate";
import { lookupTablebaseCandidate } from "./reliability/checkers-fusion";

export const TRIAD_PANELISTS: Panelist[] = ["LLAMA", "DEEPSEEK", "QWEN"];

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

/** Synthetic params so Undercover + Slavic paths run on stubs (cosine < 0.92 vs B). */
const STUB_PARAM_ARRAY_A: number[] = Array.from({ length: 16 }, (_, i) => 0.25 + i * 0.028);
const STUB_PARAM_ARRAY_B: number[] = Array.from(
  { length: 16 },
  (_, i) => 0.5 + 0.18 * Math.sin((i * Math.PI) / 8)
);

/**
 * Stub candidates for a single panelist (used by `/api/triad/*` routes and `makeTriadFetcher(true)`).
 * Replace with real inference when API keys are wired.
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
  baseUrl = ""
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
      body: JSON.stringify({ prompt }),
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
  }
): Promise<AIAnalysis> {
  const pg = validatePromptForTriad(prompt);
  if (pg.ok === false) {
    throw new Error(`Prompt rejected: ${pg.reason}`);
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

  if (tablebaseCandidate) {
    candidates = [tablebaseCandidate];
    meanPanelistMs = 0;
    triadFailureRate = 0;
  } else if (fetcher) {
    const chunks = await Promise.all(
      TRIAD_PANELISTS.map(async (panelist) => {
        const controller = new AbortController();
        const s = controller.signal;
        if (signal) signal.addEventListener("abort", () => controller.abort());
        try {
          const { value, durationMs } = await withTriadPanelistTiming(runId, panelist, () =>
            withTimeout(fetcher(prompt, panelist, s), AI_TIMEOUT_MS)
          );
          return { value, durationMs, failed: false as const };
        } catch {
          return {
            value: [] as AICandidate[],
            durationMs: AI_TIMEOUT_MS,
            failed: true as const,
          };
        }
      })
    );
    candidates = chunks.flatMap((c) => c.value);
    meanPanelistMs =
      chunks.reduce((a, c) => a + c.durationMs, 0) / Math.max(chunks.length, 1);
    triadFailureRate =
      chunks.filter((c) => c.failed || c.value.length === 0).length / Math.max(chunks.length, 1);
  } else {
    const chunks = await Promise.all(
      TRIAD_PANELISTS.map((panelist) =>
        withTriadPanelistTiming(runId, panelist, () =>
          stubPanelistCandidates(prompt, panelist, signal)
        )
      )
    );
    candidates = chunks.flatMap((c) => c.value);
    meanPanelistMs =
      chunks.reduce((a, c) => a + c.durationMs, 0) / Math.max(chunks.length, 1);
    triadFailureRate = 0;
  }

  let valid = filterValid(candidates)
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
  });

  return {
    candidates: valid,
    ...(validationSummary !== undefined && { validationSummary }),
  };
}
