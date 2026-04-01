import { logEvent, MAX_CANDIDATES } from "@alchemist/shared-engine";
import { parseAssistantJsonArray } from "@/lib/parse-assistant-json-array";
import { readOpenAiAssistantText } from "@/lib/openai-compatible-chat";
import { triadPanelistSystemPrompt } from "@/lib/triad-panelist-system-prompt";
import { normalizeRawCandidateItem } from "@/lib/triad-llm-normalize";
import type { AICandidate } from "@alchemist/shared-types";
import { isValidAICandidateArray } from "@/lib/triad-candidate-validation";

export interface DeepSeekFetchResult {
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
 * Live DeepSeek chat completion → `DeepSeekFetchResult`.
 * Task 1: Implements a 2-attempt retry loop on malformed or structurally invalid JSON.
 */
export async function fetchDeepSeekCandidates(
  prompt: string,
  apiKey: string,
  signal: AbortSignal,
  model: string,
  baseUrl: string,
  learningContext?: string,
  runId?: string,
): Promise<DeepSeekFetchResult> {
  const panelist = "DEEPSEEK" as const;
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
        throw new Error(`DeepSeek HTTP ${response.status}`);
      }

      const body: unknown = await response.json();

      let parsedUsage: { promptTokens: number; completionTokens: number; totalTokens: number } | null = null;
      if (typeof body === "object" && body !== null && "usage" in body) {
        const u = (body as any).usage;
        if (typeof u?.prompt_tokens === "number" && typeof u?.completion_tokens === "number") {
          parsedUsage = {
            promptTokens: u.prompt_tokens,
            completionTokens: u.completion_tokens,
            totalTokens: u.total_tokens ?? (u.prompt_tokens + u.completion_tokens),
          };
        }
      }

      const content = readOpenAiAssistantText(body);
      if (content === null) {
        throw new Error("DeepSeek: missing message content");
      }

      let raw: unknown;
      try {
        raw = parseAssistantJsonArray(content);
      } catch {
        throw new Error("DeepSeek: response not valid JSON");
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
