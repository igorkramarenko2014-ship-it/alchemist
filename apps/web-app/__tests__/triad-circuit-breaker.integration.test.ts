import { describe, expect, it, vi } from "vitest";

describe("triad circuit breaker integration", () => {
  it("returns 503 fast when breaker is open (and emits triad_circuit_breaker_skip telemetry)", async () => {
    // Disable triad rate-limit for deterministic test.
    process.env.ALCHEMIST_TRIAD_RATE_LIMIT_DISABLED = "1";

    // Ensure route considers DEEPSEEK configured so it doesn't short-circuit as `triad_unconfigured`.
    process.env.DEEPSEEK_API_KEY = "dummy";

    vi.resetModules();

    const { triadPanelPost } = await import("@/lib/triad-panel-route");
    const { getTriadCircuitBreakerForPanelist } = await import("@/lib/triad-circuit-breakers");

    const breaker = getTriadCircuitBreakerForPanelist("DEEPSEEK");
    breaker.reset();
    // Default defaults: minSamplesToTrip=3, failureRateThreshold=0.5.
    // Recording 3 failures yields failure rate 1.0 => open.
    breaker.recordFailure();
    breaker.recordFailure();
    breaker.recordFailure();
    expect(breaker.isOpen()).toBe(true);

    const stderrLines: string[] = [];
    const spy = vi
      .spyOn(process.stderr, "write")
      .mockImplementation((chunk: any) => {
        const s = typeof chunk === "string" ? chunk : String(chunk);
        stderrLines.push(s);
        return true;
      });

    const req = new Request("http://localhost/api/triad/deepseek", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "127.0.0.1",
        "x-real-ip": "127.0.0.1",
      },
      body: JSON.stringify({ prompt: "dark growling reese bass", userMode: "PRO" }),
    });

    const t0 = Date.now();
    const res = await triadPanelPost(req, "DEEPSEEK");
    const dt = Date.now() - t0;

    spy.mockRestore();

    expect(dt).toBeLessThan(500); // fast-fail expectation
    expect(res.status).toBe(503);
    expect(res.headers.get("x-alchemist-triad-mode")).toBe("circuit-open");
    expect(res.headers.get("x-alchemist-panelist")).toBe("DEEPSEEK");

    const json = await res.json();
    expect(json.candidates).toEqual([]);

    const joined = stderrLines.join("");
    const hasSkip = joined.includes('"event":"triad_circuit_breaker_skip"');
    expect(hasSkip).toBe(true);
  });
});

