import { MAX_CANDIDATES } from "@alchemist/shared-engine";
import { readOpenAiAssistantText } from "@/lib/openai-compatible-chat";
import { triadPanelistSystemPrompt } from "@/lib/triad-panelist-system-prompt";
import { normalizeRawCandidateItem } from "@/lib/triad-llm-normalize";
import type { AICandidate } from "@alchemist/shared-types";

const GROQ_CHAT_COMPLETIONS_URL = "https://api.groq.com/openai/v1/chat/completions";

/** Default Groq model id; override with `LLAMA_GROQ_MODEL` in env (read via `env.ts`). */
export const DEFAULT_LLAMA_GROQ_MODEL = "llama-3.3-70b-versatile";

/**
 * Live Llama-family via Groq OpenAI-compatible API (`LLAMA` panelist = HERMES in logs).
 */
export async function fetchLlamaCandidates(
  prompt: string,
  apiKey: string,
  signal: AbortSignal,
  model: string = DEFAULT_LLAMA_GROQ_MODEL
): Promise<AICandidate[]> {
  const panelist = "LLAMA" as const;
  const response = await fetch(GROQ_CHAT_COMPLETIONS_URL, {
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
        { role: "system", content: triadPanelistSystemPrompt(panelist) },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Llama (Groq) HTTP ${response.status}`);
  }

  const body: unknown = await response.json();
  const content = readOpenAiAssistantText(body);
  if (content === null) {
    throw new Error("Llama (Groq): missing message content");
  }

  let raw: unknown;
  try {
    raw = JSON.parse(content.trim());
  } catch {
    throw new Error("Llama (Groq): response not valid JSON");
  }

  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .slice(0, MAX_CANDIDATES)
    .map((item) => normalizeRawCandidateItem(item, panelist))
    .filter((c): c is AICandidate => c != null);
}
