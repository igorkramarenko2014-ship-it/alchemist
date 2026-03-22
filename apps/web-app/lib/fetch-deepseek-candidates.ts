import { MAX_CANDIDATES } from "@alchemist/shared-engine";
import { normalizeRawCandidateItem } from "@/lib/triad-llm-normalize";
import type { AICandidate } from "@alchemist/shared-types";

/**
 * Live DeepSeek chat completion → `AICandidate[]`.
 * Relies on outer `AbortSignal` / `withTimeout` from `runTriad` — no nested timer here.
 */
export async function fetchDeepSeekCandidates(
  prompt: string,
  apiKey: string,
  signal: AbortSignal
): Promise<AICandidate[]> {
  const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
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
        {
          role: "system",
          content: [
            "You are a Serum VST preset assistant.",
            "Return ONLY a JSON array of objects. No markdown fences. No preamble.",
            "Each object: { score: number in [0,1], reasoning: string (at least 20 characters),",
            "paramArray: number[] (each in [0,1], varied values, at least 8 entries when included),",
            'panelist: "DEEPSEEK" }.',
            "You may omit state or use minimal empty objects; omit paramArray only if you cannot satisfy ranges.",
            "Return between 1 and 8 objects.",
          ].join(" "),
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`DeepSeek HTTP ${response.status}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error("DeepSeek: missing message content");
  }

  let raw: unknown;
  try {
    raw = JSON.parse(content.trim());
  } catch {
    throw new Error("DeepSeek: response not valid JSON");
  }

  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .slice(0, MAX_CANDIDATES)
    .map((item) => normalizeRawCandidateItem(item, "DEEPSEEK"))
    .filter((c): c is AICandidate => c != null);
}
