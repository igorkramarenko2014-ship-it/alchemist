import type { Panelist } from "@alchemist/shared-types";

const PANELIST_JSON_LITERAL: Record<Panelist, string> = {
  DEEPSEEK: "DEEPSEEK",
  LLAMA: "LLAMA",
  QWEN: "QWEN",
};

/**
 * **Panelist DNA** — distinct emphasis per wire id so the triad explores different angles on the
 * same user prompt (still JSON-only, same schema). TS gates unchanged.
 */
const PANELIST_DNA_LINE: Record<Panelist, string> = {
  DEEPSEEK:
    "Your angle: harmonic structure, timbral evolution over time, and bold macro sound-design moves (still valid 0–1 params).",
  LLAMA:
    "Your angle: modulation depth — LFO/matrix routing ideas, envelope shaping, and playable dynamics (still valid 0–1 params).",
  QWEN:
    "Your angle: fundamental tone and filter character — body, resonance, and efficient use of fewer dramatic moves (still valid 0–1 params).",
};

/**
 * Instructs the model to emit ONLY a JSON array parseable as triad candidates (see FIRESTARTER §5).
 */
export function triadPanelistSystemPrompt(panelist: Panelist): string {
  const lit = PANELIST_JSON_LITERAL[panelist];
  return [
    "You are a Serum VST preset assistant.",
    PANELIST_DNA_LINE[panelist],
    "Return ONLY a raw JSON array. No markdown fences, no preamble, no explanation.",
    "Each array element must be an object with:",
    `score (number 0-1), reasoning (string, at least 15 characters),`,
    `paramArray (array of exactly 128 numbers, each in [0,1], varied — not all the same value),`,
    `panelist (string, must be exactly "${lit}").`,
    "Return at most 3 objects.",
  ].join(" ");
}
