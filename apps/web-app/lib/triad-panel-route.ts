import { env } from "@/env";
import { fetchDeepSeekCandidates } from "@/lib/fetch-deepseek-candidates";
import {
  DEFAULT_LLAMA_GROQ_MODEL,
  fetchLlamaCandidates,
} from "@/lib/fetch-llama-candidates";
import { fetchQwenCandidates } from "@/lib/fetch-qwen-candidates";
import {
  AI_TIMEOUT_MS,
  isValidCandidate,
  logEvent,
  newTriadRunId,
  PANELIST_ALCHEMIST_CODENAME,
  stubPanelistCandidates,
  validatePromptForTriad,
} from "@alchemist/shared-engine";
import type { AICandidate, Panelist } from "@alchemist/shared-types";
import { NextResponse } from "next/server";

function nowMs(): number {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
}

/** Merge client abort with `AI_TIMEOUT_MS` (same budget as `runTriad` outer timeout). */
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

function triadResponseHeaders(panelist: Panelist, mode: "fetcher" | "stub"): Record<string, string> {
  return {
    "x-alchemist-triad-mode": mode,
    "x-alchemist-panelist": panelist,
  };
}

export async function triadPanelPost(request: Request, panelist: Panelist) {
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

  const guard = validatePromptForTriad(prompt);
  if (guard.ok === false) {
    return NextResponse.json({ error: guard.reason }, { status: 400 });
  }

  const runId = newTriadRunId();
  const alchemistCodename = PANELIST_ALCHEMIST_CODENAME[panelist];
  const promptLength = prompt.length;

  const useDeepSeekLive = panelist === "DEEPSEEK" && env.deepseekApiKey.length > 0;
  const useQwenLive = panelist === "QWEN" && env.qwenApiKey.length > 0;
  const useLlamaLive = panelist === "LLAMA" && env.llamaApiKey.length > 0;
  const llamaModel =
    env.llamaGroqModel.length > 0 ? env.llamaGroqModel : DEFAULT_LLAMA_GROQ_MODEL;

  if (useDeepSeekLive || useQwenLive || useLlamaLive) {
    logEvent("triad_run_start", {
      runId,
      panelist,
      promptLength,
      mode: "fetcher",
    });
    const t0 = nowMs();
    const { signal, dispose } = mergeAiTimeoutSignal(AI_TIMEOUT_MS, request.signal);
    let candidates: AICandidate[] = [];
    let error: string | undefined;
    try {
      if (useDeepSeekLive) {
        candidates = await fetchDeepSeekCandidates(prompt, env.deepseekApiKey, signal);
      } else if (useQwenLive) {
        candidates = await fetchQwenCandidates(
          prompt,
          env.qwenApiKey,
          signal,
          env.qwenBaseUrl
        );
      } else {
        candidates = await fetchLlamaCandidates(
          prompt,
          env.llamaApiKey,
          signal,
          llamaModel
        );
      }
      candidates = candidates.filter(isValidCandidate);
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      candidates = [];
    } finally {
      dispose();
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
      { candidates },
      { headers: triadResponseHeaders(panelist, "fetcher") }
    );
  }

  logEvent("triad_run_start", {
    runId,
    panelist,
    promptLength,
    mode: "stub",
  });
  const t0 = nowMs();
  let candidates: AICandidate[];
  try {
    candidates = await stubPanelistCandidates(prompt, panelist, request.signal);
    candidates = candidates.filter(isValidCandidate);
  } catch (e) {
    const durationMs = Math.round(nowMs() - t0);
    const errMsg = e instanceof Error ? e.message : String(e);
    logEvent("triad_panelist_end", {
      runId,
      panelist,
      alchemistCodename,
      candidateCount: 0,
      durationMs,
      mode: "stub",
      error: errMsg,
    });
    return NextResponse.json(
      { candidates: [] },
      { headers: triadResponseHeaders(panelist, "stub") }
    );
  }
  const durationMs = Math.round(nowMs() - t0);
  logEvent("triad_panelist_end", {
    runId,
    panelist,
    alchemistCodename,
    candidateCount: candidates.length,
    durationMs,
    mode: "stub",
  });
  return NextResponse.json(
    { candidates },
    { headers: triadResponseHeaders(panelist, "stub") }
  );
}
