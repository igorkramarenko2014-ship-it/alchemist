/**
 * Narrow OpenAI-shaped chat completion JSON (no `any` on the full response).
 */
export function readOpenAiAssistantText(body: unknown): string | null {
  if (typeof body !== "object" || body === null) return null;
  const root = body as Record<string, unknown>;
  const choices = root.choices;
  if (!Array.isArray(choices) || choices.length === 0) return null;
  const ch0 = choices[0];
  if (typeof ch0 !== "object" || ch0 === null) return null;
  const msg = (ch0 as Record<string, unknown>).message;
  if (typeof msg !== "object" || msg === null) return null;
  const content = (msg as Record<string, unknown>).content;
  return typeof content === "string" ? content : null;
}
