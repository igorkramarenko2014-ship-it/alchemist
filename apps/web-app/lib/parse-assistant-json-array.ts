/**
 * Extract a JSON array from model assistant text, including ```json fenced blocks.
 * Returns the parsed value (expected to be an array at call sites).
 */
export function parseAssistantJsonArray(content: string): unknown {
  const stripped = content
    .replace(/```json\n?/gi, "")
    .replace(/```\n?/g, "")
    .trim();
  return JSON.parse(stripped) as unknown;
}
