import { MAX_CANDIDATES } from "@alchemist/shared-engine/constants";
import { normalizeRawCandidateItem } from "@/lib/triad-llm-normalize";
import type { AICandidate } from "@alchemist/shared-types";

/**
 * Live Llama-family via Groq OpenAI-compatible API (`LLAMA` panelist = HERMES in logs).
 * @see https://console.groq.com/docs/openai
 * Relies on outer `AbortSignal` / `withTimeout` from `runTriad`.
 */
const GROQ_CHAT_COMPLETIONS_URL = "https://api.groq.com/openai/v1/chat/completions";

/** Default Groq model id; override with `LLAMA_GROQ_MODEL` in env (read via `env.ts`). */
export const DEFAULT_LLAMA_GROQ_MODEL = "llama-3.3-70b-versatile";

export async function fetchLlamaCandidates(
  prompt: string,
  apiKey: string,
  signal: AbortSignal,
  model: string = DEFAULT_LLAMA_GROQ_MODEL
): Promise<AICandidate[]> {
  const panelistLiteral = "LLAMA";
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
        {
          role: "system",
          content: [
            "You are a Serum VST preset assistant.",
            "Return ONLY a JSON array of objects. No markdown fences. No preamble.",
            "Each object: { score: number in [0,1], reasoning: string (at least 20 characters),",
            "paramArray: number[] (each in [0,1], varied values, at least 8 entries when included),",
            `panelist: "${panelistLiteral}" }.`,
            "You may omit state or use minimal empty objects; omit paramArray only if you cannot satisfy ranges.",
            "Return between 1 and 8 objects.",
          ].join(" "),
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Llama (Groq) HTTP ${response.status}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
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
    .map((item) => normalizeRawCandidateItem(item, "LLAMA"))
    .filter((c): c is AICandidate => c != null);
}
