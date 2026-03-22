import { env } from "@/env";
import { fetchDeepSeekCandidates } from "@/lib/fetch-deepseek-candidates";
import {
  DEFAULT_LLAMA_GROQ_MODEL,
  fetchLlamaCandidates,
} from "@/lib/fetch-llama-candidates";
import { fetchQwenCandidates } from "@/lib/fetch-qwen-candidates";
import { stubPanelistCandidates, validatePromptForTriad } from "@alchemist/shared-engine";
import type { Panelist } from "@alchemist/shared-types";
import { NextResponse } from "next/server";

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

  try {
    const useDeepSeekLive = panelist === "DEEPSEEK" && env.deepseekApiKey.length > 0;
    const useQwenLive = panelist === "QWEN" && env.qwenApiKey.length > 0;
    const useLlamaLive = panelist === "LLAMA" && env.llamaApiKey.length > 0;
    const llamaModel =
      env.llamaGroqModel.length > 0 ? env.llamaGroqModel : DEFAULT_LLAMA_GROQ_MODEL;

    let candidates: Awaited<ReturnType<typeof stubPanelistCandidates>>;
    if (useDeepSeekLive) {
      candidates = await fetchDeepSeekCandidates(prompt, env.deepseekApiKey, request.signal);
    } else if (useQwenLive) {
      candidates = await fetchQwenCandidates(prompt, env.qwenApiKey, request.signal);
    } else if (useLlamaLive) {
      candidates = await fetchLlamaCandidates(
        prompt,
        env.llamaApiKey,
        request.signal,
        llamaModel
      );
    } else {
      candidates = await stubPanelistCandidates(prompt, panelist, request.signal);
    }

    const mode =
      useDeepSeekLive || useQwenLive || useLlamaLive ? "fetcher" : "stub";
    return NextResponse.json(
      { candidates },
      {
        headers: {
          "x-alchemist-triad-mode": mode,
          "x-alchemist-panelist": panelist,
        },
      }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/abort/i.test(msg)) {
      return NextResponse.json({ error: "aborted" }, { status: 408 });
    }
    return NextResponse.json({ error: "triad_failed", message: msg }, { status: 500 });
  }
}
