import { redactSensitive } from "./telemetry-redact";

/**
 * Structured telemetry — prefer this over ad-hoc console.log on server paths (FIRESTARTER §3).
 * Payloads are passed through **`redactSensitive`** before stringify (API-key-shaped substrings, etc.).
 */
export function logEvent(event: string, payload?: Record<string, unknown>): void {
  const raw = {
    ts: new Date().toISOString(),
    event,
    ...payload,
  };
  const line = JSON.stringify(redactSensitive(raw));
  if (typeof process !== "undefined" && typeof process.stderr?.write === "function") {
    process.stderr.write(`${line}\n`);
  } else if (typeof console !== "undefined" && typeof console.error === "function") {
    console.error(line);
  }
}
