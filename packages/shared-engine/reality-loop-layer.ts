/**
 * Reality Loop Layer (RLL) — process-local ring buffer + numeric aggregates.
 *
 * Canon: this is **observability and hinting only**. It never mutates gates,
 * triad weights, or routes. IOM can read aggregates to surface behavioral schisms.
 */
import type {
  RealityGroundTruthAggregate,
  RealityTelemetryEventName,
} from "@alchemist/shared-types";
import { REALITY_TELEMETRY_EVENTS } from "@alchemist/shared-types";

type RealityRingEvent = {
  tsMs: number;
  event: RealityTelemetryEventName;
};

const DEFAULT_WINDOW_MS = 60 * 60 * 1000; // 1h
const RING_MAX_EVENTS = 5000;

const ring: RealityRingEvent[] = [];

export interface RealitySignalAggregatesOptions {
  /** Sliding window for aggregation. */
  windowMs?: number;
}

function nowMs(): number {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
}

/**
 * Records one RLL event into the local ring buffer.
 * Called by `logRealitySignal` (shared-engine).
 */
export function recordRealityTelemetryEvent(
  event: RealityTelemetryEventName
): void {
  ring.push({ tsMs: Date.now(), event });
  if (ring.length > RING_MAX_EVENTS) {
    ring.splice(0, ring.length - RING_MAX_EVENTS);
  }
}

/**
 * Returns numeric aggregates used by IOM schism detector and SOE (hint text).
 * Pure-ish: it only reads local memory state.
 */
export function getRealitySignalAggregates(
  opts: RealitySignalAggregatesOptions = {}
): RealityGroundTruthAggregate & {
  /** Denominator used by `retryRate/shareRate/exportAttemptRate`. */
  sampleSize: number;
} {
  const windowMs = opts.windowMs ?? DEFAULT_WINDOW_MS;
  const t = Date.now();
  const win = ring.filter((e) => t - e.tsMs <= windowMs);

  const count = (ev: RealityTelemetryEventName): number =>
    win.reduce((acc, x) => (x.event === ev ? acc + 1 : acc), 0);

  const outputViewedCount = count(REALITY_TELEMETRY_EVENTS.OUTPUT_VIEWED);
  const outputUsedCount = count(REALITY_TELEMETRY_EVENTS.OUTPUT_USED);
  const outputModifiedCount = count(REALITY_TELEMETRY_EVENTS.OUTPUT_MODIFIED);
  const outputDiscardedCount = count(REALITY_TELEMETRY_EVENTS.OUTPUT_DISCARDED);
  const outputReusedLaterCount = count(REALITY_TELEMETRY_EVENTS.OUTPUT_REUSED_LATER);
  const userRecoveredFromFailureCount = count(
    REALITY_TELEMETRY_EVENTS.USER_RECOVERED_FROM_FAILURE
  );

  const presetSharedCount = count(REALITY_TELEMETRY_EVENTS.PRESET_SHARED);
  const exportAttemptedCount = count(REALITY_TELEMETRY_EVENTS.EXPORT_ATTEMPTED);

  // Used by SOE: adoption is judged over "survived vs edited vs discarded".
  const sampleWindowEvents = outputUsedCount + outputModifiedCount + outputDiscardedCount;

  // Used by IOM schism rates.
  const sampleSize =
    outputViewedCount +
    outputUsedCount +
    outputModifiedCount +
    outputDiscardedCount +
    outputReusedLaterCount +
    userRecoveredFromFailureCount;

  const retryRate =
    sampleSize > 0 ? outputDiscardedCount / sampleSize : undefined;
  const shareRate = sampleSize > 0 ? presetSharedCount / sampleSize : undefined;
  const exportAttemptRate =
    sampleSize > 0 ? exportAttemptedCount / sampleSize : undefined;

  return {
    sampleWindowEvents,
    sampleSize,
    retryRate,
    shareRate,
    exportAttemptRate,
    outputUsedCount,
    outputModifiedCount,
    outputDiscardedCount,
  };
}

/** Test helper: clear in-memory state. */
export function __resetRealityRingForTests(): void {
  ring.length = 0;
}

