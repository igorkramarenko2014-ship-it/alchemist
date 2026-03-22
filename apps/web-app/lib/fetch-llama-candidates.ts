import { logEvent, MAX_CANDIDATES } from "@alchemist/shared-engine";
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
  model: string = DEFAULT_LLAMA_GROQ_MODEL,
  runId?: string
): Promise<AICandidate[]> {
  const panelist = "LLAMA" as const;
  const rid = runId ?? "";
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

  const rawBodyText = await response.text();
  let data: unknown;
  try {
    data = JSON.parse(rawBodyText) as unknown;
  } catch (err) {
    logEvent("llama_parse_error", {
      error: err instanceof Error ? err.message : String(err),
      rawPreview: rawBodyText.slice(0, 200),
      runId: rid,
      stage: "http_body_json",
    });
    return [];
  }

  if (typeof data !== "object" || data === null) {
    logEvent("llama_parse_error", {
      error: "Groq response root not an object",
      rawPreview: rawBodyText.slice(0, 200),
      runId: rid,
    });
    return [];
  }

  const root = data as Record<string, unknown>;
  if ("error" in root && root.error != null) {
    const errObj = root.error;
    const msg =
      typeof errObj === "object" &&
      errObj !== null &&
      "message" in errObj &&
      typeof (errObj as { message: unknown }).message === "string"
        ? (errObj as { message: string }).message
        : String(errObj);
    logEvent("llama_parse_error", {
      error: msg,
      rawPreview: rawBodyText.slice(0, 200),
      runId: rid,
      stage: "groq_error_field",
    });
    return [];
  }

  const choices = root.choices;
  if (!Array.isArray(choices) || choices.length === 0) {
    logEvent("llama_parse_error", {
      error: "missing or empty choices",
      rawPreview: rawBodyText.slice(0, 200),
      runId: rid,
    });
    return [];
  }

  const content = readOpenAiAssistantText(data);
  if (content === null) {
    logEvent("llama_parse_error", {
      error: "missing assistant message content",
      rawPreview: rawBodyText.slice(0, 200),
      runId: rid,
    });
    return [];
  }

  logEvent("llama_raw_response_debug", { raw: content.slice(0, 500), runId: rid });

  const stripped = content
    .replace(/```json\n?/gi, "")
    .replace(/```\n?/g, "")
    .trim();

  let raw: unknown;
  try {
    raw = JSON.parse(stripped);
  } catch (err) {
    logEvent("llama_parse_error", {
      error: err instanceof Error ? err.message : String(err),
      rawPreview: content.slice(0, 200),
      runId: rid,
      stage: "assistant_content_json",
    });
    return [];
  }

  if (!Array.isArray(raw)) {
    logEvent("llama_parse_error", {
      error: "assistant JSON is not an array",
      rawPreview: content.slice(0, 200),
      runId: rid,
    });
    return [];
  }

  return raw
    .slice(0, MAX_CANDIDATES)
    .map((item) => normalizeRawCandidateItem(item, panelist))
    .filter((c): c is AICandidate => c != null);
}
