import { MAX_CANDIDATES } from "@alchemist/shared-engine";
import { readOpenAiAssistantText } from "@/lib/openai-compatible-chat";
import { triadPanelistSystemPrompt } from "@/lib/triad-panelist-system-prompt";
import { normalizeRawCandidateItem } from "@/lib/triad-llm-normalize";
import type { AICandidate } from "@alchemist/shared-types";

const QWEN_COMPAT_COMPLETIONS_URL =
  "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";

/**
 * Live Qwen via Alibaba DashScope OpenAI-compatible API.
 */
export async function fetchQwenCandidates(
  prompt: string,
  apiKey: string,
  signal: AbortSignal
): Promise<AICandidate[]> {
  const panelist = "QWEN" as const;
  const response = await fetch(QWEN_COMPAT_COMPLETIONS_URL, {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "qwen-plus",
      max_tokens: 1024,
      messages: [
        { role: "system", content: triadPanelistSystemPrompt(panelist) },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Qwen HTTP ${response.status}`);
  }

  const body: unknown = await response.json();
  const content = readOpenAiAssistantText(body);
  if (content === null) {
    throw new Error("Qwen: missing message content");
  }

  let raw: unknown;
  try {
    raw = JSON.parse(content.trim());
  } catch {
    throw new Error("Qwen: response not valid JSON");
  }

  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .slice(0, MAX_CANDIDATES)
    .map((item) => normalizeRawCandidateItem(item, panelist))
    .filter((c): c is AICandidate => c != null);
}
