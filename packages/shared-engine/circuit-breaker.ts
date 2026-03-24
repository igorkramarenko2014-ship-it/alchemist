/**
 * Optional **triad HTTP resilience** helper — sliding-window failure rate → open → half-open → closed.
 *
 * **Not** wired to **`/api/triad/*`** by default: opt in from app code with explicit composition.
 * Telemetry: **`circuit_breaker_*`** via **`logEvent`** (stderr JSON) — assessment-friendly, no gate mutation.
 */
import { logEvent } from "./telemetry";

export interface TriadCircuitBreakerConfig {
  /** Trip when failure rate in the window is >= this value (e.g. 0.5). */
  failureRateThreshold: number;
  /** Max recent outcomes kept (0 = success, 1 = failure). */
  windowSize: number;
  /** Stay open at least this long before half-open probe. */
  openDurationMs: number;
  /** Successes required in half-open to close. */
  halfOpenSuccessNeeded: number;
  /** Minimum samples before tripping from failure rate (avoids opening on first error). */
  minSamplesToTrip: number;
}

export type CircuitBreakerPhase = "closed" | "open" | "half_open";

const DEFAULTS: TriadCircuitBreakerConfig = {
  failureRateThreshold: 0.5,
  windowSize: 10,
  openDurationMs: 60_000,
  halfOpenSuccessNeeded: 3,
  minSamplesToTrip: 3,
};

export class TriadCircuitBreaker {
  private readonly config: TriadCircuitBreakerConfig;
  private outcomes: number[] = [];
  private phase: CircuitBreakerPhase = "closed";
  private phaseChangedAt = Date.now();
  private halfOpenSuccesses = 0;

  constructor(config?: Partial<TriadCircuitBreakerConfig>) {
    this.config = { ...DEFAULTS, ...config };
  }

  getPhase(): CircuitBreakerPhase {
    return this.phase;
  }

  getFailureRate(): number {
    if (this.outcomes.length === 0) return 0;
    const fails = this.outcomes.filter((x) => x === 1).length;
    return fails / this.outcomes.length;
  }

  private push(ok: boolean): void {
    this.outcomes.push(ok ? 0 : 1);
    if (this.outcomes.length > this.config.windowSize) {
      this.outcomes.shift();
    }
  }

  allowRequest(): boolean {
    const now = Date.now();
    if (this.phase === "closed") return true;
    if (this.phase === "open") {
      if (now - this.phaseChangedAt >= this.config.openDurationMs) {
        this.transitionHalfOpen();
        return true;
      }
      return false;
    }
    return true;
  }

  recordSuccess(): void {
    if (this.phase === "half_open") {
      this.halfOpenSuccesses += 1;
      this.push(true);
      if (this.halfOpenSuccesses >= this.config.halfOpenSuccessNeeded) {
        this.transitionClosed();
      }
      return;
    }
    if (this.phase === "closed") {
      this.push(true);
    }
  }

  recordFailure(): void {
    this.push(false);
    if (this.phase === "half_open") {
      this.transitionOpen("half_open_failure");
      return;
    }
    if (this.phase === "closed") {
      const n = this.outcomes.length;
      if (n >= this.config.minSamplesToTrip && this.getFailureRate() >= this.config.failureRateThreshold) {
        this.transitionOpen("failure_rate");
      }
    }
  }

  /** Test / operator reset — does not imply route wiring. */
  reset(): void {
    this.outcomes = [];
    this.phase = "closed";
    this.phaseChangedAt = Date.now();
    this.halfOpenSuccesses = 0;
    logEvent("circuit_breaker_reset", { timestamp: Date.now() });
  }

  private transitionOpen(reason: string): void {
    this.phase = "open";
    this.phaseChangedAt = Date.now();
    this.halfOpenSuccesses = 0;
    logEvent("circuit_breaker_opened", {
      reason,
      failureRate: this.getFailureRate(),
      threshold: this.config.failureRateThreshold,
      timestamp: Date.now(),
    });
  }

  private transitionHalfOpen(): void {
    this.phase = "half_open";
    this.phaseChangedAt = Date.now();
    this.halfOpenSuccesses = 0;
    logEvent("circuit_breaker_half_open", { timestamp: Date.now() });
  }

  private transitionClosed(): void {
    this.phase = "closed";
    this.phaseChangedAt = Date.now();
    this.outcomes = [];
    this.halfOpenSuccesses = 0;
    logEvent("circuit_breaker_closed", { timestamp: Date.now() });
  }
}

/**
 * Run **`fn`** when the breaker allows; on success/failure update state.
 * If blocked and **`fallback`** is set, run **`fallback`** instead of throwing.
 */
export async function withTriadCircuitBreaker<T>(
  breaker: TriadCircuitBreaker,
  fn: () => Promise<T>,
  fallback?: () => Promise<T>,
): Promise<T> {
  if (!breaker.allowRequest()) {
    logEvent("circuit_breaker_blocked", {
      phase: breaker.getPhase(),
      timestamp: Date.now(),
    });
    if (fallback) {
      return fallback();
    }
    throw new Error("triad_circuit_breaker_open");
  }
  try {
    const r = await fn();
    breaker.recordSuccess();
    return r;
  } catch (e) {
    breaker.recordFailure();
    throw e;
  }
}
