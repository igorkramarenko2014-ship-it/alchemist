import {
  REALITY_TELEMETRY_EVENTS,
  type RealityTelemetryEventName,
} from "@alchemist/shared-types";
import { logEvent } from "./telemetry";
import { recordRealityTelemetryEvent } from "./reality-loop-layer";

type RealityTelemetryKind = keyof typeof REALITY_TELEMETRY_EVENTS;

const FORBIDDEN_PAYLOAD_KEYS = /^(prompt|userText|message|raw)$/i;
export const ALLOW_STUB_LEARNING = process.env.ALCHEMIST_ALLOW_STUB_LEARNING === "1";

/**
 * Drops risky keys and keeps a shallow safe object for stderr JSON.
 * Full payloads should already omit raw prompts — this is defense in depth.
 */
export function sanitizeRealitySignalPayload(
  payload: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(payload)) {
    if (FORBIDDEN_PAYLOAD_KEYS.test(k)) continue;
    if (typeof v === "string" && v.length > 512) {
      out[k] = `${v.slice(0, 509)}…`;
      continue;
    }
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      continue;
    }
    out[k] = v;
  }
  return out;
}

/**
 * Emits one RLL line on stderr — same path as `logEvent` (redaction applies).
 * Prefer this over ad-hoc event names for outcome / export signals.
 */
export function logRealitySignal(
  kind: RealityTelemetryKind,
  payload: Record<string, unknown> = {}
): void {
  if (payload.mode === "stub" && !ALLOW_STUB_LEARNING) {
    return;
  }
  const event: RealityTelemetryEventName = REALITY_TELEMETRY_EVENTS[kind];
  recordRealityTelemetryEvent(event);
  logEvent(event, {
    layer: "reality_loop",
    ...sanitizeRealitySignalPayload(payload),
  });
}
