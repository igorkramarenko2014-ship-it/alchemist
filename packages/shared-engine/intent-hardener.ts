/**
 * **Intent guard** — cheap, deterministic checks on triad **HTTP intent** before provider calls.
 *
 * Composes **`validatePromptForTriad`** (size / code fences) with optional **`userMode`** validation
 * and light **signal** heuristics. **Not** a substitute for Undercover / Slavic / consensus gates on
 * **`AICandidate`**; **`SerumState`** bodies remain schema-shaped in **`shared-types`** until the
 * offset map fills real fields — this layer does not invent Serum bytes.
 */
import type { UserMode } from "@alchemist/shared-types";
import {
  TRIAD_PROMPT_MAX_CHARS,
  validatePromptForTriad,
  type PromptGuardReason,
} from "./prompt-guard";

export type IntentHardenerReason =
  | PromptGuardReason
  | "invalid_user_mode"
  | "low_signal_prompt"
  | "pathological_repetition";

export interface TriadIntentInput {
  prompt: string;
  /** When present, must be **`PRO`** or **`NEWBIE`** (wire contract for future UI). */
  userMode?: unknown;
}

const USER_MODES = new Set<UserMode>(["PRO", "NEWBIE"]);

/** Letters + ASCII spaces only — prompts that are mostly symbols/punctuation waste triad budget. */
function letterSpaceRatio(s: string): number {
  if (s.length === 0) return 0;
  let n = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if ((c >= 65 && c <= 90) || (c >= 97 && c <= 122) || c === 32) n += 1;
  }
  return n / s.length;
}

/** Single character dominates (spam / paste errors). */
function dominantCharRatio(s: string): number {
  if (s.length === 0) return 0;
  const counts = new Map<string, number>();
  for (const ch of s) {
    counts.set(ch, (counts.get(ch) ?? 0) + 1);
  }
  const max = Math.max(0, ...Array.from(counts.values()));
  return max / s.length;
}

/**
 * Validate triad request intent before upstream inference. Returns **`ok: false`** with a stable
 * **`reason`** for **`400`** responses (map in route handlers).
 */
export function validateTriadIntent(
  input: TriadIntentInput,
): { ok: true } | { ok: false; reason: IntentHardenerReason; detail?: string } {
  const prompt = typeof input.prompt === "string" ? input.prompt : "";
  const base = validatePromptForTriad(prompt);
  if (base.ok === false) {
    return base;
  }

  if (input.userMode !== undefined && input.userMode !== null) {
    if (typeof input.userMode !== "string" || !USER_MODES.has(input.userMode as UserMode)) {
      return {
        ok: false,
        reason: "invalid_user_mode",
        detail: "userMode must be PRO or NEWBIE when sent",
      };
    }
  }

  const t = prompt.trim();
  if (t.length >= 80 && letterSpaceRatio(t) < 0.12) {
    return {
      ok: false,
      reason: "low_signal_prompt",
      detail: "prompt is mostly non-letters; refine with musical / preset intent",
    };
  }

  if (t.length >= 24 && dominantCharRatio(t) > 0.45) {
    return {
      ok: false,
      reason: "pathological_repetition",
      detail: "prompt has excessive single-character repetition",
    };
  }

  return { ok: true };
}

export { TRIAD_PROMPT_MAX_CHARS };
