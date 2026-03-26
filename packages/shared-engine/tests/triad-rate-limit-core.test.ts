import { describe, expect, it, beforeEach } from "vitest";
import {
  checkTriadRateLimitCore,
  __resetTriadRateLimitCoreForTests,
} from "../pnh/triad-rate-limit-core";

describe("triad-rate-limit-core", () => {
  beforeEach(() => {
    __resetTriadRateLimitCoreForTests();
  });

  const cfg = { windowMs: 60_000, maxPerWindow: 5, burstMax: 2 };
  const t0 = 1_700_000_000_000;

  it("allows traffic under both caps", () => {
    expect(checkTriadRateLimitCore("ip-a", "fp1", t0, { config: cfg })).toEqual({ allowed: true });
    expect(checkTriadRateLimitCore("ip-a", "fp2", t0, { config: cfg })).toEqual({ allowed: true });
  });

  it("blocks identical prompt fingerprint beyond burstMax", () => {
    expect(checkTriadRateLimitCore("ip-a", "same", t0, { config: cfg })).toEqual({ allowed: true });
    expect(checkTriadRateLimitCore("ip-a", "same", t0, { config: cfg })).toEqual({ allowed: true });
    expect(checkTriadRateLimitCore("ip-a", "same", t0, { config: cfg })).toEqual({
      allowed: false,
      reason: "slavic_swarm_detected",
    });
  });

  it("blocks total window count beyond maxPerWindow", () => {
    for (let i = 0; i < 5; i++) {
      expect(checkTriadRateLimitCore("ip-b", `fp${i}`, t0, { config: cfg }).allowed).toBe(true);
    }
    expect(checkTriadRateLimitCore("ip-b", "fpX", t0, { config: cfg })).toEqual({
      allowed: false,
      reason: "rate_limit_exceeded",
    });
  });

  it("respects disabled flag", () => {
    for (let i = 0; i < 20; i++) {
      expect(
        checkTriadRateLimitCore("ip-c", "x", t0, { disabled: true, config: cfg }).allowed,
      ).toBe(true);
    }
  });
});
