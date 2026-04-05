import { logEvent, MAX_CANDIDATES } from "@alchemist/shared-engine";
import { parseAssistantJsonArray } from "@/lib/parse-assistant-json-array";
import { readOpenAiAssistantText } from "@/lib/openai-compatible-chat";
import { triadPanelistSystemPrompt } from "@/lib/triad-panelist-system-prompt";
import { normalizeRawCandidateItem } from "@/lib/triad-llm-normalize";
import type { AICandidate } from "@alchemist/shared-types";
import { isValidAICandidateArray } from "@/lib/triad-candidate-validation";

export interface LlamaFetchResult {
  candidates: AICandidate[];
  retryCount: number;
  retryExhausted: boolean;
  tokenUsage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  } | null;
}

/**
 * Live Llama-family via Groq OpenAI-compatible API (`LLAMA` panelist = HERMES in logs).
 * Task 1: Implements a 2-attempt retry loop on malformed or structurally invalid JSON.
 */
export async function fetchLlamaCandidates(
  prompt: string,
  apiKey: string,
  signal: AbortSignal,
  model: string,
  baseUrl: string,
  runId?: string,
  learningContext?: string,
): Promise<LlamaFetchResult> {
  const panelist = "LLAMA" as const;
  const rid = runId ?? "";
  let retryCount = 0;
  let retryExhausted = false;
  const url = `${baseUrl.replace(/\/$/, "")}/chat/completions`;

  for (let attempt = 1; attempt <= 2; attempt++) {
    const isRetry = attempt === 2;
    const currentPrompt = isRetry
      ? `${prompt}\n\n[RETRY_NUDGE] Respond only with a valid JSON array of candidates. No prose.`
      : prompt;

    try {
      const response = await fetch(url, {
        method: "POST",
        signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          max_tokens: 1024,
          messages: [
            {
              role: "system",
              content: triadPanelistSystemPrompt(panelist, {
                learningContext: learningContext?.trim() || undefined,
              }),
            },
            { role: "user", content: currentPrompt },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`Llama (Groq) HTTP ${response.status}`);
      }

      const rawBodyText = await response.text();
      let data: unknown;
      try {
        data = JSON.parse(rawBodyText) as unknown;
      } catch (err) {
        throw new Error(`HTTP body parse error: ${err instanceof Error ? err.message : String(err)}`);
      }

      let parsedUsage: { promptTokens: number; completionTokens: number; totalTokens: number } | null = null;
      if (typeof data === "object" && data !== null && "usage" in data) {
        const u = (data as any).usage;
        if (typeof u?.prompt_tokens === "number" && typeof u?.completion_tokens === "number") {
          parsedUsage = {
            promptTokens: u.prompt_tokens,
            completionTokens: u.completion_tokens,
            totalTokens: u.total_tokens ?? (u.prompt_tokens + u.completion_tokens),
          };
        }
      }

      if (typeof data !== "object" || data === null) {
        throw new Error("Groq response root not an object");
      }

      const root = data as Record<string, unknown>;
      if ("error" in root && root.error != null) {
        throw new Error(`Groq error field: ${JSON.stringify(root.error)}`);
      }

      const content = readOpenAiAssistantText(data);
      if (content === null) {
        throw new Error("missing assistant message content");
      }

      let raw: unknown;
      try {
        raw = parseAssistantJsonArray(content);
      } catch (err) {
        throw new Error(`Assistant JSON parse error: ${err instanceof Error ? err.message : String(err)}`);
      }

      const normalized = Array.isArray(raw)
        ? raw
            .slice(0, MAX_CANDIDATES)
            .map((item) => normalizeRawCandidateItem(item, panelist))
            .filter((c): c is AICandidate => c != null)
        : [];

      if (!isValidAICandidateArray(normalized) || normalized.length === 0) {
        throw new Error("Invalid or empty candidate array structure");
      }

      return { candidates: normalized, retryCount, retryExhausted: false, tokenUsage: parsedUsage };

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);

      logEvent("panelist_response_malformed", {
        panelist,
        runId: rid,
        attempt,
        error: errorMsg,
        note: isRetry ? "Second attempt failed" : "First attempt failed, retrying..."
      });

      if (!isRetry) {
        retryCount = 1;
        continue;
      } else {
        retryExhausted = true;
      }
    }
  }

  logEvent("panelist_response_retry_exhausted", {
    panelist,
    runId: rid,
    retryCount
  });

  return { candidates: [], retryCount, retryExhausted: true, tokenUsage: null };
}
