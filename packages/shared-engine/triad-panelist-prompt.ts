/**
 * **Panelist DNA** — system-prompt copy for live **`/api/triad/*`** fetchers.
 *
 * Wire IDs stay **DEEPSEEK / LLAMA / QWEN**. **ATHENA / HERMES / HESTIA** are **product codenames**
 * (telemetry / UI alignment — `triad-panel-governance.ts`); they do not change gate math.
 *
 * Canonical implementation lives here so **`shared-engine` Vitest** covers distinct, non-empty DNA.
 */
import type { Panelist } from "@alchemist/shared-types";

const PANELIST_JSON_LITERAL: Record<Panelist, string> = {
  DEEPSEEK: "DEEPSEEK",
  LLAMA: "LLAMA",
  QWEN: "QWEN",
};

/**
 * Distinct emphasis blocks — keep mutually exclusive vocabulary where possible so Slavic sees
 * less clone pressure upstream.
 */
export const PANELIST_DNA: Record<Panelist, readonly string[]> = {
  DEEPSEEK: [
    "Panelist codename ATHENA (wire id DEEPSEEK): own **harmonic architecture**—stacked oscillators, detune/unison, interval relationships, and **complex modulation-matrix-style routing ideas** (still expressible as 0–1 params).",
    "Push paramArray so osc + filter + macro-relevant slots diverge musically; avoid a flat uniform grid unless the user asked for minimal.",
    "Do not converge on the same timbral story as a rhythm-first or saturation-first panelist—bias toward pitch/harmony depth.",
  ],
  LLAMA: [
    "Panelist codename HERMES (wire id LLAMA): own **rhythmic movement**—**LFO-driven** timbral shifts, envelope groove (attack/decay/sustain), pulse/sync-adjacent motion, playable dynamics.",
    "Favor paramArray trajectories that feel animated over time, not a static pad, unless the prompt demands stillness.",
    "Do not imitate ATHENA’s harmonic-stack obsession or HESTIA’s saturation/filter-body story—stay in motion and groove.",
  ],
  QWEN: [
    "Panelist codename HESTIA (wire id QWEN): own **timbral texture**—wavetable motion, **analog-style** warmth, **filter body/resonance**, tasteful drive/saturation, noise/air where it helps.",
    "Favor smooth spectral evolution in paramArray; avoid random jumps; keep values strictly in [0,1].",
    "Do not chase ATHENA’s harmonic-stack primacy or HERMES’s LFO-pulse primacy—bias tone, grit, and filter character.",
  ],
};

/** Joined DNA paragraph for assertions / snapshots. */
export function panelistDnaText(panelist: Panelist): string {
  return PANELIST_DNA[panelist].join(" ");
}

/**
 * Full system message for OpenAI-compatible triad routes (JSON array of candidates only).
 */
export function triadPanelistSystemPrompt(panelist: Panelist): string {
  const lit = PANELIST_JSON_LITERAL[panelist];
  const dna = PANELIST_DNA[panelist].join(" ");
  return [
    "You are a Serum VST preset assistant.",
    dna,
    "Return ONLY a raw JSON array. No markdown fences, no preamble, no explanation.",
    "Each array element must be an object with:",
    `score (number 0-1), reasoning (string, at least 15 characters),`,
    `paramArray (array of exactly 128 numbers, each in [0,1], varied — not all the same value),`,
    `panelist (string, must be exactly "${lit}").`,
    "Return at most 3 objects.",
  ].join(" ");
}
