/**
 * Core sliding-window limiter for triad HTTP surface (SLAVIC_SWARM / credit-drain mitigation).
 * **`apps/web-app`** supplies client IP + prompt fingerprint; state is in-memory per Node instance.
 */
import { logEvent } from "../telemetry";

export type TriadRateLimitConfig = {
  windowMs: number;
  maxPerWindow: number;
  burstMax: number;
};

export type TriadRateLimitCoreResult = { allowed: true } | { allowed: false; reason: string };

type Window = { count: number; resetAt: number };

const windows = new Map<string, Window>();

const DEFAULTS: TriadRateLimitConfig = {
  windowMs: 60_000,
  maxPerWindow: 20,
  burstMax: 5,
};

function envInt(name: string, fallback: number): number {
  if (typeof process === "undefined" || !process.env) return fallback;
  const v = process.env[name];
  if (!v) return fallback;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function triadRateLimitConfigFromEnv(): TriadRateLimitConfig {
  return {
    windowMs: envInt("ALCHEMIST_TRIAD_RL_WINDOW_MS", DEFAULTS.windowMs),
    maxPerWindow: envInt("ALCHEMIST_TRIAD_RL_MAX", DEFAULTS.maxPerWindow),
    burstMax: envInt("ALCHEMIST_TRIAD_RL_BURST_MAX", DEFAULTS.burstMax),
  };
}

function tickWindow(map: Map<string, Window>, key: string, now: number, windowMs: number): Window {
  let w = map.get(key);
  if (!w || now > w.resetAt) {
    w = { count: 0, resetAt: now + windowMs };
    map.set(key, w);
  }
  return w;
}

/** @internal */
export function __resetTriadRateLimitCoreForTests(): void {
  windows.clear();
}

/**
 * When **`disabled`** is true, always allows (e.g. tests or explicit operator override).
 */
export function checkTriadRateLimitCore(
  clientKey: string,
  promptFingerprint: string,
  nowMs: number,
  options?: { disabled?: boolean; config?: TriadRateLimitConfig },
): TriadRateLimitCoreResult {
  if (options?.disabled === true) return { allowed: true };
  const cfg = options?.config ?? triadRateLimitConfigFromEnv();
  const winKey = `${clientKey}:triad`;
  const burstKey = `${clientKey}:burst:${promptFingerprint}`;

  const w = tickWindow(windows, winKey, nowMs, cfg.windowMs);
  w.count += 1;
  if (w.count > cfg.maxPerWindow) {
    logEvent("pnh_rate_limit_triggered", {
      reason: "window_exceeded",
      count: w.count,
      windowMs: cfg.windowMs,
    });
    return { allowed: false, reason: "rate_limit_exceeded" };
  }

  const b = tickWindow(windows, burstKey, nowMs, cfg.windowMs);
  b.count += 1;
  if (b.count > cfg.burstMax) {
    logEvent("pnh_slavic_swarm_detected", {
      reason: "identical_prompt_burst",
      count: b.count,
      promptFingerprint,
    });
    return { allowed: false, reason: "slavic_swarm_detected" };
  }

  return { allowed: true };
}
