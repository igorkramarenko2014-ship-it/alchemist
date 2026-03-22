import { isValidCandidate } from "@alchemist/shared-engine/validate";
import { MAX_CANDIDATES } from "@alchemist/shared-engine/constants";
import type { AICandidate, SerumState } from "@alchemist/shared-types";

function emptySerumState(): SerumState {
  return {
    meta: {},
    master: {},
    oscA: {},
    oscB: {},
    noise: {},
    filter: {},
    envelopes: [],
    lfos: [],
    fx: {},
    matrix: [],
  };
}

function normalizeRawItem(raw: unknown): AICandidate | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const score = typeof o.score === "number" ? o.score : Number.NaN;
  const reasoning = typeof o.reasoning === "string" ? o.reasoning : "";
  let paramArray: number[] | undefined;
  if (Array.isArray(o.paramArray)) {
    const nums = o.paramArray.map((x) => (typeof x === "number" ? x : Number.NaN));
    if (nums.length > 0 && nums.every((x) => !Number.isNaN(x))) {
      paramArray = nums;
    }
  }
  const state =
    o.state != null && typeof o.state === "object"
      ? (o.state as SerumState)
      : emptySerumState();
  const candidate: AICandidate = {
    state,
    score,
    reasoning,
    panelist: "DEEPSEEK",
    ...(paramArray ? { paramArray } : {}),
  };
  if (typeof o.description === "string" && o.description.length > 0) {
    candidate.description = o.description;
  }
  return isValidCandidate(candidate) ? candidate : null;
}

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
            'panelist: \"DEEPSEEK\" }.',
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
    .map((item) => normalizeRawItem(item))
    .filter((c): c is AICandidate => c != null);
}
