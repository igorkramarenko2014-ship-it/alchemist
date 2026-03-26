import { env } from "@/env";
import { checkTriadRateLimit } from "@/lib/triad-rate-limit";
import { fetchDeepSeekCandidates } from "@/lib/fetch-deepseek-candidates";
import { appendPnhHistoryJsonl, triadIntentPnhPartition } from "@/lib/pnh-triad-attack-log";
import { getTriadCircuitBreakerForPanelist } from "@/lib/triad-circuit-breakers";
import {
  DEFAULT_LLAMA_GROQ_MODEL,
  fetchLlamaCandidates,
} from "@/lib/fetch-llama-candidates";
import { fetchQwenCandidates } from "@/lib/fetch-qwen-candidates";
import {
  applyPnhTriadPromptDefense,
  auditTriadCandidatesForPnhResponseEcho,
  evaluatePnhContext,
  getDefaultPnhAttackMemoryStore,
  isValidCandidate,
  logEvent,
  newTriadRunId,
  PANELIST_ALCHEMIST_CODENAME,
  pnhIntentFailureDecisionWithMemory,
  triadApiPnhLaneFromEnv,
} from "@alchemist/shared-engine";
import type { AICandidate, Panelist } from "@alchemist/shared-types";
import type { IntentHardenerReason } from "@alchemist/shared-engine";
import { NextResponse } from "next/server";

/** Upstream provider budget per panelist (server-side). */
const PANELIST_UPSTREAM_TIMEOUT_MS: Record<Panelist, number> = {
  DEEPSEEK: 12_000,
  LLAMA: 5_000,
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
  const alchemistCodename = PANELIST_ALCHEMIST_CODENAME[panelist];
  const promptLength = promptForTriad.length;

  const useDeepSeekLive = panelist === "DEEPSEEK" && deepseekConfigured;
  const useQwenLive = panelist === "QWEN" && qwenConfigured;
  const useLlamaLive = panelist === "LLAMA" && llamaConfigured;
  const llamaModel =
    env.llamaGroqModel.length > 0 ? env.llamaGroqModel : DEFAULT_LLAMA_GROQ_MODEL;

  if (!(useDeepSeekLive || useQwenLive || useLlamaLive)) {
    logEvent("triad_run_start", {
      runId,
      panelist,
      promptLength,
      mode: "unconfigured",
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
  });
  const t0 = nowMs();
  const timeoutMs = options?.timeoutMs ?? PANELIST_UPSTREAM_TIMEOUT_MS[panelist];
  const { signal, dispose } = mergeAiTimeoutSignal(timeoutMs, request.signal);
  let candidates: AICandidate[] = [];
  let error: string | undefined;
  try {
    if (useDeepSeekLive) {
      candidates = await fetchDeepSeekCandidates(promptForTriad, env.deepseekApiKey, signal);
    } else if (useQwenLive) {
      candidates = await fetchQwenCandidates(
        promptForTriad,
        env.qwenApiKey,
        signal,
        env.qwenBaseUrl
      );
    } else {
      candidates = await fetchLlamaCandidates(
        promptForTriad,
        env.llamaApiKey,
        signal,
        llamaModel,
        runId
      );
    }
    const echoAudited = auditTriadCandidatesForPnhResponseEcho(candidates, {
      runId,
      panelist,
    });
    candidates = echoAudited.candidates.filter(isValidCandidate);
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
    ...(error !== undefined ? { error } : {}),
  });
  return NextResponse.json(
    {
      candidates,
      triadModeTag: "fetcher" as const,
      triadPanelist: panelist,
    },
    { headers: triadResponseHeaders(panelist, "fetcher") }
  );
}
