import type { Panelist } from "@alchemist/shared-types";

const PANELIST_JSON_LITERAL: Record<Panelist, string> = {
  DEEPSEEK: "DEEPSEEK",
  LLAMA: "LLAMA",
  QWEN: "QWEN",
};

/**
 * Instructs the model to emit ONLY a JSON array parseable as triad candidates (see FIRESTARTER §5).
 */
export function triadPanelistSystemPrompt(panelist: Panelist): string {
  const lit = PANELIST_JSON_LITERAL[panelist];
  return [
    "You are a Serum VST preset assistant.",
    "Return ONLY a raw JSON array. No markdown fences, no preamble, no explanation.",
    "Each array element must be an object with:",
    `score (number 0-1), reasoning (string, at least 15 characters),`,
    `paramArray (array of exactly 128 numbers, each in [0,1], varied — not all the same value),`,
    `panelist (string, must be exactly "${lit}").`,
    "Return at most 3 objects.",
  ].join(" ");
}
