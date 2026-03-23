import { MAX_CANDIDATES } from "@alchemist/shared-engine";
import { parseAssistantJsonArray } from "@/lib/parse-assistant-json-array";
import { readOpenAiAssistantText } from "@/lib/openai-compatible-chat";
import { triadPanelistSystemPrompt } from "@/lib/triad-panelist-system-prompt";
import { normalizeRawCandidateItem } from "@/lib/triad-llm-normalize";
import type { AICandidate } from "@alchemist/shared-types";

const DEEPSEEK_CHAT_URL = "https://api.deepseek.com/v1/chat/completions";

/**
 * Live DeepSeek chat completion → `AICandidate[]`.
 * Outer `AbortSignal` must enforce the route upstream timeout (see `triad-panel-route.ts`).
 */
export async function fetchDeepSeekCandidates(
  prompt: string,
  apiKey: string,
  signal: AbortSignal
): Promise<AICandidate[]> {
  const panelist = "DEEPSEEK" as const;
  const response = await fetch(DEEPSEEK_CHAT_URL, {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      max_tokens: 1024,
      messages: [
        { role: "system", content: triadPanelistSystemPrompt(panelist) },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`DeepSeek HTTP ${response.status}`);
  }

  const body: unknown = await response.json();
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

  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .slice(0, MAX_CANDIDATES)
    .map((item) => normalizeRawCandidateItem(item, panelist))
    .filter((c): c is AICandidate => c != null);
}
