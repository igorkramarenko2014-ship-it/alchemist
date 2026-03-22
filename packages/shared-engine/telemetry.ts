/**
 * Structured telemetry — prefer this over ad-hoc console.log on server paths (FIRESTARTER §3).
 */
export function logEvent(event: string, payload?: Record<string, unknown>): void {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    event,
    ...payload,
  });
  if (typeof process !== "undefined" && typeof process.stderr?.write === "function") {
    process.stderr.write(`${line}\n`);
  } else if (typeof console !== "undefined" && typeof console.error === "function") {
    console.error(line);
  }
}
