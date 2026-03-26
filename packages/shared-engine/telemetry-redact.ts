/**
 * Best-effort redaction for **`logEvent`** payloads before stderr — mitigates accidental secret echo
 * in provider errors (mirror_image / APT catalog). Not a substitute for never logging secrets.
 */

const REDACT_PATTERNS: readonly RegExp[] = [
  /\bsk-[A-Za-z0-9]{20,}\b/g,
  /\bgsk_[A-Za-z0-9]{20,}\b/g,
  /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi,
  /api[_-]?key['":\s]+[A-Za-z0-9\-._]{16,}/gi,
  /\boffset:\s*0x[0-9A-Fa-f]{4,}\b/gi,
];

function redactString(s: string): string {
  let out = s;
  for (const p of REDACT_PATTERNS) {
    out = out.replace(p, "[REDACTED]");
  }
  return out;
}

/** Deep-walk JSON-serializable values; unknown types stringified then redacted. */
export function redactSensitive(input: unknown): unknown {
  if (input === null || input === undefined) return input;
  if (typeof input === "string") return redactString(input);
  if (typeof input === "number" || typeof input === "boolean") return input;
  if (Array.isArray(input)) return input.map(redactSensitive);
  if (typeof input === "object") {
    return Object.fromEntries(
      Object.entries(input as Record<string, unknown>).map(([k, v]) => [k, redactSensitive(v)]),
    );
  }
  return redactString(String(input));
}
