/**
 * Triad entry guard — oversized / code-fence prompts rejected before inference (FIRESTARTER §3).
 */
export const TRIAD_PROMPT_MAX_CHARS = 2000;

export type PromptGuardReason = "empty" | "too_long" | "code_fence";

export function validatePromptForTriad(
  prompt: string
): { ok: true } | { ok: false; reason: PromptGuardReason } {
  const t = prompt.trim();
  if (!t) return { ok: false, reason: "empty" };
  if (t.length > TRIAD_PROMPT_MAX_CHARS) return { ok: false, reason: "too_long" };
  if (/```/.test(t)) return { ok: false, reason: "code_fence" };
  return { ok: true };
}
