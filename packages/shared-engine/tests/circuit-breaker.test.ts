import { describe, expect, it, vi } from "vitest";
import { TriadCircuitBreaker, withTriadCircuitBreaker } from "../circuit-breaker";

describe("TriadCircuitBreaker", () => {
  it("starts closed and allows requests", () => {
    const b = new TriadCircuitBreaker({ windowSize: 5, minSamplesToTrip: 2, failureRateThreshold: 0.5 });
    expect(b.getPhase()).toBe("closed");
    expect(b.allowRequest()).toBe(true);
  });

  it("opens when failure rate exceeds threshold after min samples", () => {
    vi.useFakeTimers();
    const b = new TriadCircuitBreaker({
      windowSize: 4,
      minSamplesToTrip: 3,
      failureRateThreshold: 0.5,
      openDurationMs: 5,
      halfOpenSuccessNeeded: 2,
    });
    b.recordFailure();
    b.recordFailure();
    expect(b.getPhase()).toBe("closed");
    b.recordFailure();
    expect(b.getPhase()).toBe("open");
    expect(b.isOpen()).toBe(true);
    expect(b.allowRequest()).toBe(false);
    vi.useRealTimers();
  });

  it("half-opens after open duration and can close after successes", async () => {
    vi.useFakeTimers();
    const b = new TriadCircuitBreaker({
      windowSize: 6,
      minSamplesToTrip: 2,
      failureRateThreshold: 0.5,
      openDurationMs: 100,
      halfOpenSuccessNeeded: 2,
    });
    b.recordFailure();
    b.recordFailure();
    expect(b.getPhase()).toBe("open");
    vi.advanceTimersByTime(100);
    expect(b.allowRequest()).toBe(true);
    expect(b.getPhase()).toBe("half_open");
    b.recordSuccess();
    b.recordSuccess();
    expect(b.getPhase()).toBe("closed");
    vi.useRealTimers();
  });

  it("withTriadCircuitBreaker uses fallback when blocked", async () => {
    vi.useFakeTimers();
    const b = new TriadCircuitBreaker({
      windowSize: 3,
      minSamplesToTrip: 2,
      failureRateThreshold: 0.4,
      openDurationMs: 10_000,
      halfOpenSuccessNeeded: 1,
    });
    b.recordFailure();
    b.recordFailure();
    expect(b.getPhase()).toBe("open");
    const r = await withTriadCircuitBreaker(
      b,
      async () => "live",
      async () => "fallback",
    );
    expect(r).toBe("fallback");
    vi.useRealTimers();
  });
});
