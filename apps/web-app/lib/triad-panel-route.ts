import { env } from "@/env";
import { getEngineSchoolTriadAugmentation } from "@/lib/engine-school-triad-context";
import { checkTriadRateLimit } from "@/lib/triad-rate-limit";
import { fetchDeepSeekCandidates } from "@/lib/fetch-deepseek-candidates";
import { appendPnhHistoryJsonl, triadIntentPnhPartition } from "@/lib/pnh-triad-attack-log";
import { getTriadCircuitBreakerForPanelist } from "@/lib/triad-circuit-breakers";
import {
  fetchLlamaCandidates,
} from "@/lib/fetch-llama-candidates";
import { fetchQwenCandidates } from "@/lib/fetch-qwen-candidates";
import {
  applyPnhTriadPromptDefense,
  auditTriadCandidatesForPnhResponseEcho,
  detectPnhAptPromptMatches,
  evaluatePnhContext,
  getDefaultPnhAttackMemoryStore,
  isValidCandidate,
  logEvent,
  logRealitySignal,
  newTriadRunId,
  PANELIST_ALCHEMIST_CODENAME,
  pnhIntentFailureDecisionWithMemory,
  triadApiPnhLaneFromEnv,
} from "@alchemist/shared-engine";
import type { AICandidate, Panelist } from "@alchemist/shared-types";
import type { IntentHardenerReason } from "@alchemist/shared-engine";
import { getGFUSCBurnState } from "./gfusc-burn-check";
import { NextResponse } from "next/server";
import {
  appendEngineSchoolTelemetryJsonl,
  type EngineSchoolTelemetryRecord,
} from "@/lib/learning-telemetry-jsonl";

/** Upstream provider budget per panelist (server-side). */
const PANELIST_UPSTREAM_TIMEOUT_MS: Record<Panelist, number> = {
  DEEPSEEK: 12_000,
  LLAMA: 12_000,
  QWEN: 12_000,
};

function nowMs(): number {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
}

/** Merge client abort with route timeout (per panelist upstream budget). */
function mergeAiTimeoutSignal(
  timeoutMs: number,
  requestSignal: AbortSignal
): { signal: AbortSignal; dispose: () => void } {
  const ctrl = new AbortController();
  const tid = setTimeout(() => {
    ctrl.abort(new Error("triad panelist timeout"));
  }, timeoutMs);
  const onReqAbort = () => {
    clearTimeout(tid);
    const r = requestSignal.reason;
    ctrl.abort(r !== undefined ? r : new Error("request aborted"));
  };
  if (requestSignal.aborted) {
    clearTimeout(tid);
    onReqAbort();
    return { signal: ctrl.signal, dispose: () => {} };
  }
  requestSignal.addEventListener("abort", onReqAbort, { once: true });
  return {
    signal: ctrl.signal,
    dispose: () => {
      clearTimeout(tid);
      requestSignal.removeEventListener("abort", onReqAbort);
    },
  };
}

function triadResponseHeaders(
  panelist: Panelist,
  mode: "fetcher" | "unconfigured" | "circuit-open"
): Record<string, string> {
  return {
    "x-alchemist-triad-mode": mode,
    "x-alchemist-panelist": panelist,
  };
}

/**
 * Score stats from panelist candidates after route-local validation only.
 * Slavic + Undercover + triad merge gates run in the browser `runTriad` — see `triad_run_end` there.
 */
function candidateScoreStats(candidates: readonly AICandidate[]): {
  bestScore: number | null;
  meanScore: number | null;
} {
  const scores = candidates
    .map((c) => c.score)
    .filter((s): s is number => typeof s === "number" && Number.isFinite(s));
  if (scores.length === 0) return { bestScore: null, meanScore: null };
  const sum = scores.reduce((a, b) => a + b, 0);
  return { bestScore: Math.max(...scores), meanScore: sum / scores.length };
}

/** Opt-in stderr JSON: `ALCHEMIST_LEARNING_CONTEXT=1` + learning telemetry (default on in dev / Vercel preview — see `env.ts`). */
function logEngineSchoolInfluenceTelemetry(
  runId: string,
  panelist: Panelist,
  learningContext: string,
  learningContextUsed: {
    injected: boolean;
    selectedLessonIds: string[];
    contextCharCount?: number;
    selectedClusters?: string[];
    lessonFitnessTrace?: Array<{
      lessonId: string;
      fitnessScore: number | null;
      fitnessConfidence: string | null;
    }>;
  },
  candidateCount: number,
  mode: "unconfigured" | "circuit_open" | "fetcher",
  triadSessionId: string | undefined,
  extras?: {
    upstreamError?: boolean;
    /** Panelist route only: upstream → echo audit → `isValidCandidate`. Not full triad gates. */
    panelistPipeline?: {
      rawFromFetcher: number;
      afterEchoAudit: number;
      afterBasicValidation: number;
      bestScore: number | null;
      meanScore: number | null;
    };
  },
): void {
  if (!env.learningContextEnabled || !env.learningTelemetryEnabled) return;
  const sessionKey = triadSessionId !== undefined && triadSessionId.length > 0 ? triadSessionId : runId;
  const appliedRules =
    learningContextUsed.injected && mode === "fetcher"
      ? (["priorityMappingKeys", "coreRules", "contrastWith"] as const)
      : [];
  const ctxChars = learningContextUsed.contextCharCount ?? learningContext.length;
  const pipe = extras?.panelistPipeline;
  const raw = pipe?.rawFromFetcher ?? 0;
  const afterEcho = pipe?.afterEchoAudit ?? 0;
  const passedPv = pipe?.afterBasicValidation ?? (mode === "fetcher" ? candidateCount : 0);
  const best = pipe?.bestScore ?? null;
  const mean = pipe?.meanScore ?? null;
  const denom = Math.max(raw, 1);
  const panelistPassRate = mode === "fetcher" ? Math.min(1, Math.max(0, passedPv / denom)) : 0;
  const baselineScore: number | null = null;
  const deltaScore =
    best !== null && baselineScore !== null ? best - baselineScore : null;
  const passLift = mode === "fetcher" ? panelistPassRate : null;

  const trace = learningContextUsed.lessonFitnessTrace ?? [];
  const fitnessScores = learningContextUsed.selectedLessonIds.map((id) => {
    const row = trace.find((t) => t.lessonId === id);
    return row?.fitnessScore ?? null;
  });
  logEvent("engine_school_influence", {
    runId,
    triadSessionId: sessionKey,
    panelist,
    lessonsUsed: learningContextUsed.selectedLessonIds,
    selectedClusters: learningContextUsed.selectedClusters ?? [],
    injected: learningContextUsed.injected,
    contextChars: learningContext.length,
    contextCharCount: ctxChars,
    appliedRules: [...appliedRules],
    candidateCount,
    mode,
    ...(trace.length > 0 ? { lessonFitnessTrace: trace, fitnessScores } : {}),
    ...(extras?.upstreamError ? { upstreamError: true } : {}),
    ...(pipe !== undefined
      ? {
          panelistPipeline: pipe,
          fullGatePipeline: "client_runTriad" as const,
        }
      : {}),
  });

  if (!env.learningTelemetryFileEnabled) return;
  const row: EngineSchoolTelemetryRecord = {
    eventType: "engine_school_influence",
    timestampUtc: new Date().toISOString(),
    source: "triad_panel_route",
    runId,
    triadSessionId: sessionKey,
    panelist,
    lessonIds: learningContextUsed.selectedLessonIds,
    appliedRules: [...appliedRules],
    contextChars: ctxChars,
    mode,
    injected: learningContextUsed.injected,
    ...(extras?.upstreamError ? { upstreamError: true } : {}),
    candidatesGenerated: raw,
    afterEchoAudit: afterEcho,
    passedPanelistValidation: passedPv,
    bestScore: best,
    meanScore: mean,
    panelistPassRate,
    fullGatePipeline: "client_runTriad",
    baselineScore,
    deltaScore,
    passLift,
    selectedClusters:
      learningContextUsed.selectedClusters?.filter(
        (c) => typeof c === "string" && c.trim().length > 0,
      ) ?? [],
    ...(trace.length > 0
      ? {
          lessonFitnessTrace: trace,
          fitnessScores,
        }
      : {}),
  };
  appendEngineSchoolTelemetryJsonl(row, {
    telemetryDirOverride: env.learningTelemetryDir,
  });
}

export type TriadPanelPostOptions = {
  /** Per-route override of default upstream timeout. */
  timeoutMs?: number;
};

export async function triadPanelPost(
  request: Request,
  panelist: Panelist,
  options?: TriadPanelPostOptions
) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const prompt =
    body !== null &&
    typeof body === "object" &&
    "prompt" in body &&
    typeof (body as { prompt: unknown }).prompt === "string"
      ? (body as { prompt: string }).prompt.trim()
      : "";
  if (!prompt) {
    return NextResponse.json({ error: "prompt_required" }, { status: 400 });
  }

  const triadSessionIdFromBody =
    body !== null &&
    typeof body === "object" &&
    "triadSessionId" in body &&
    typeof (body as { triadSessionId?: unknown }).triadSessionId === "string"
      ? (body as { triadSessionId: string }).triadSessionId.trim()
      : undefined;

  const burnState = getGFUSCBurnState();
  if (burnState) {
    return NextResponse.json(
      { error: "gfusc_burn_active", message: "Engine burned — killswitch active." },
      { 
        status: 410,
        headers: {
          "x-alchemist-gfusc": "burned",
          "x-alchemist-burned-at": burnState.burnedAtUtc
        }
      }
    );
  }

  // Reality Loop: the user requested an output (triad view/generation intent).
  logRealitySignal("OUTPUT_VIEWED", { surface: "dock", panelist });

  const aptMatches = detectPnhAptPromptMatches(prompt);
  if (aptMatches.length > 0) {
    logEvent("pnh_high_severity_probe_match", {
      scenarioIds: aptMatches,
      panelist,
      note: "APT catalog prompt heuristic — observability only; no gate mutation",
    });
  }

  const rate = checkTriadRateLimit(request, prompt);
  if (rate.allowed === false) {
    return NextResponse.json(
      { candidates: [], error: rate.reason },
      {
        status: 429,
        headers: {
          "x-alchemist-triad-mode": "rate-limited",
          "x-alchemist-panelist": panelist,
        },
      },
    );
  }

  const userMode =
    body !== null &&
    typeof body === "object" &&
    "userMode" in body &&
    (body as { userMode?: unknown }).userMode !== undefined
      ? (body as { userMode: unknown }).userMode
      : undefined;

  const deepseekConfigured = env.deepseekApiKey.length > 0;
  const qwenConfigured = env.qwenApiKey.length > 0;
  const llamaConfigured = env.llamaApiKey.length > 0;
  const triadFullyLiveServer = deepseekConfigured && qwenConfigured && llamaConfigured;
  const anyPanelistKeys = deepseekConfigured || qwenConfigured || llamaConfigured;

  const laneEarly = triadApiPnhLaneFromEnv(
    deepseekConfigured && panelist === "DEEPSEEK"
      ? true
      : qwenConfigured && panelist === "QWEN"
        ? true
        : llamaConfigured && panelist === "LLAMA",
    triadFullyLiveServer,
  );
  let promptForTriad = prompt;
  const defense = applyPnhTriadPromptDefense(
    { prompt, userMode },
    {
      pnhTriadLane: laneEarly,
      allowSanitizeRecover: true,
    },
  );
  if (defense.ok) {
    promptForTriad = defense.prompt;
  }
  const guard =
    defense.ok === true
      ? ({ ok: true as const } as const)
      : ({
          ok: false as const,
          reason: defense.blockedReason as IntentHardenerReason,
          detail: defense.blockedDetail,
        } as const);
  if (guard.ok === false) {
    const useDeepSeekLive = panelist === "DEEPSEEK" && deepseekConfigured;
    const useQwenLive = panelist === "QWEN" && qwenConfigured;
    const useLlamaLive = panelist === "LLAMA" && llamaConfigured;
    const thisPanelistLive = useDeepSeekLive || useQwenLive || useLlamaLive;
    const pnhCtxEval = evaluatePnhContext({
      triadParityMode: !anyPanelistKeys ? "stub" : triadFullyLiveServer ? "fully_live" : "mixed",
      triadFullyLive: triadFullyLiveServer,
    });
    const lane = triadApiPnhLaneFromEnv(thisPanelistLive, triadFullyLiveServer);
    const { storeKey, opaqueId } = triadIntentPnhPartition(request);
    const store = getDefaultPnhAttackMemoryStore();
    const decision = pnhIntentFailureDecisionWithMemory(storeKey, guard, lane, pnhCtxEval, store);
    logEvent("pnh_intent_adaptive", {
      panelist,
      intentReason: guard.reason,
      pnhAction: decision.action,
      pnhEffectiveAction: decision.effectiveAction,
      pnhEscalationLevel: decision.escalationLevel,
      pnhPatterns: decision.patterns.map((p) => ({ id: p.id, level: p.level })),
      pnhReason: decision.reason,
      pnhScenarioId: decision.scenarioId,
      riskLevel: pnhCtxEval.riskLevel,
      environment: pnhCtxEval.environment,
      pnhMemorySnapshot: {
        opaquePartitionId: opaqueId,
        recentEventCount: decision.memory.snapshot.recentEvents.length,
        scenarioCountsBurst: decision.memory.snapshot.scenarioCountsBurst,
      },
    });
    appendPnhHistoryJsonl({
      event: "pnh_triad_intent_failure",
      opaquePartitionId: opaqueId,
      panelist,
      intentReason: guard.reason,
      escalationLevel: decision.escalationLevel,
      effectiveAction: decision.effectiveAction,
      patternIds: decision.patterns.map((p) => p.id),
    });
    return NextResponse.json(
      {
        error: guard.reason,
        ...(guard.detail !== undefined ? { message: guard.detail } : {}),
      },
      {
        status: 400,
        headers: {
          "x-alchemist-pnh-escalation": decision.escalationLevel,
          "x-alchemist-pnh-effective-action": decision.effectiveAction,
        },
      },
    );
  }

  const runId = newTriadRunId();
  const { learningContext, learningContextUsed } = getEngineSchoolTriadAugmentation(promptForTriad);
  const alchemistCodename = PANELIST_ALCHEMIST_CODENAME[panelist];
  const promptLength = promptForTriad.length;

  const useDeepSeekLive = panelist === "DEEPSEEK" && deepseekConfigured;
  const useQwenLive = panelist === "QWEN" && qwenConfigured;
  const useLlamaLive = panelist === "LLAMA" && llamaConfigured;
  const llamaModel = env.llamaGroqModel;
  const deepseekModel = env.deepseekModel;
  const qwenModel = env.qwenModel || (env.qwenBaseUrl.toLowerCase().includes("openrouter") ? "qwen/qwen2.5-7b-instruct" : "qwen-plus");

  if (!(useDeepSeekLive || useQwenLive || useLlamaLive)) {
    logEvent("triad_run_start", {
      runId,
      panelist,
      promptLength,
      mode: "unconfigured",
      learningContextUsed,
      ...(triadSessionIdFromBody !== undefined ? { triadSessionId: triadSessionIdFromBody } : {}),
    });
    const detail =
      "Set DEEPSEEK_API_KEY, QWEN_API_KEY (DashScope or OpenRouter base URL), and GROQ_API_KEY or LLAMA_API_KEY for Groq. Stub responses are disabled.";
    logEvent("triad_panelist_end", {
      runId,
      panelist,
      alchemistCodename,
      candidateCount: 0,
      durationMs: 0,
      mode: "unconfigured",
      error: "triad_unconfigured",
    });
    logEngineSchoolInfluenceTelemetry(
      runId,
      panelist,
      learningContext,
      learningContextUsed,
      0,
      "unconfigured",
      triadSessionIdFromBody,
    );
    return NextResponse.json(
      {
        error: "triad_unconfigured",
        message: detail,
        candidates: [],
        triadModeTag: "unconfigured" as const,
        triadPanelist: panelist,
      },
      { status: 503, headers: triadResponseHeaders(panelist, "unconfigured") }
    );
  }

  const breaker = getTriadCircuitBreakerForPanelist(panelist);
  // `allowRequest()` (not `isOpen()` alone) — transitions **open → half_open** after cooldown for probe traffic.
  if (!breaker.allowRequest()) {
    logEvent("triad_circuit_breaker_skip", {
      runId,
      panelist,
      alchemistCodename,
      phase: breaker.getPhase(),
      circuitOpen: breaker.isOpen(),
    });
    logEvent("triad_run_start", {
      runId,
      panelist,
      promptLength,
      mode: "circuit_open",
      learningContextUsed,
      ...(triadSessionIdFromBody !== undefined ? { triadSessionId: triadSessionIdFromBody } : {}),
    });
    logEvent("triad_panelist_end", {
      runId,
      panelist,
      alchemistCodename,
      candidateCount: 0,
      durationMs: 0,
      mode: "circuit_open",
      error: "circuit_open",
    });
    logEngineSchoolInfluenceTelemetry(
      runId,
      panelist,
      learningContext,
      learningContextUsed,
      0,
      "circuit_open",
      triadSessionIdFromBody,
    );
    return NextResponse.json(
      {
        error: "circuit_open",
        mode: "circuit-open",
        candidates: [],
        message:
          "Triad circuit breaker open for this panelist — fast-fail while the provider recovers. Retry after cooldown; see IOM schism TRIAD_CIRCUIT_OPEN on GET /api/health.",
        triadModeTag: "circuit-open" as const,
        triadPanelist: panelist,
      },
      { status: 503, headers: triadResponseHeaders(panelist, "circuit-open") }
    );
  }

  logEvent("triad_run_start", {
    runId,
    panelist,
    promptLength,
    mode: "fetcher",
    learningContextUsed,
    ...(triadSessionIdFromBody !== undefined ? { triadSessionId: triadSessionIdFromBody } : {}),
  });
  const t0 = nowMs();
  const timeoutMs = options?.timeoutMs ?? PANELIST_UPSTREAM_TIMEOUT_MS[panelist];
  const { signal, dispose } = mergeAiTimeoutSignal(timeoutMs, request.signal);
  let candidates: AICandidate[] = [];
  let error: string | undefined;
  let retryCount = 0;
  let retryExhausted = false;
  let panelistPipeline:
    | {
        rawFromFetcher: number;
        afterEchoAudit: number;
        afterBasicValidation: number;
        bestScore: number | null;
        meanScore: number | null;
      }
    | undefined;
  try {
    if (useDeepSeekLive) {
      const result = await fetchDeepSeekCandidates(
        promptForTriad,
        env.deepseekApiKey,
        signal,
        deepseekModel,
        env.deepseekBaseUrl,
        learningContext,
        runId,
      );
      candidates = result.candidates;
      retryCount = result.retryCount;
      retryExhausted = result.retryExhausted;
    } else if (useQwenLive) {
      const result = await fetchQwenCandidates(
        promptForTriad,
        env.qwenApiKey,
        signal,
        qwenModel,
        env.qwenBaseUrl,
        learningContext,
        runId,
      );
      candidates = result.candidates;
      retryCount = result.retryCount;
      retryExhausted = result.retryExhausted;
    } else {
      const result = await fetchLlamaCandidates(
        promptForTriad,
        env.llamaApiKey,
        signal,
        llamaModel,
        env.llamaGroqBaseUrl,
        runId,
        learningContext,
      );
      candidates = result.candidates;
      retryCount = result.retryCount;
      retryExhausted = result.retryExhausted;
    }
    const rawFromFetcher = candidates.length;
    const echoAudited = auditTriadCandidatesForPnhResponseEcho(candidates, {
      runId,
      panelist,
    });
    const afterEchoAudit = echoAudited.candidates.length;
    candidates = echoAudited.candidates.filter(isValidCandidate);
    const afterBasicValidation = candidates.length;
    const stats = candidateScoreStats(candidates);
    panelistPipeline = {
      rawFromFetcher,
      afterEchoAudit,
      afterBasicValidation,
      bestScore: stats.bestScore,
      meanScore: stats.meanScore,
    };
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
    candidates = [];
  } finally {
    dispose();
  }
  if (error !== undefined) {
    breaker.recordFailure();
  } else {
    breaker.recordSuccess();
  }
  const durationMs = Math.round(nowMs() - t0);
  logEvent("triad_panelist_end", {
    runId,
    panelist,
    alchemistCodename,
    candidateCount: candidates.length,
    durationMs,
    mode: "fetcher",
    retryCount,
    retryExhausted,
    ...(error !== undefined ? { error } : {}),
  });
  logEngineSchoolInfluenceTelemetry(
    runId,
    panelist,
    learningContext,
    learningContextUsed,
    candidates.length,
    "fetcher",
    triadSessionIdFromBody,
    error !== undefined
      ? { upstreamError: true }
      : panelistPipeline !== undefined
        ? { panelistPipeline }
        : undefined,
  );

  // Reality Loop: candidate list is empty => flow discarded/failed to produce usable output.
  if (candidates.length === 0) {
    const reason =
      error !== undefined
        ? error.toLowerCase().includes("timeout") || error.toLowerCase().includes("abort")
          ? "timeout"
          : "other"
        : "gate_rejected";
    logRealitySignal("OUTPUT_DISCARDED", {
      surface: "dock",
      reason,
      panelist,
    });
  }
  return NextResponse.json(
    {
      candidates,
      triadModeTag: "fetcher" as const,
      triadPanelist: panelist,
      retryCount,
      retryExhausted,
    },
    { headers: triadResponseHeaders(panelist, "fetcher") }
  );
}
