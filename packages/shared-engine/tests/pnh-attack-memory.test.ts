import { describe, expect, it, afterEach } from "vitest";
import {
  intentReasonToPnhMemoryScenarioKey,
  PnhAttackMemoryStore,
  resetPnhAttackMemoryForTests,
} from "../pnh/pnh-attack-memory";

afterEach(() => {
  resetPnhAttackMemoryForTests();
});

describe("intentReasonToPnhMemoryScenarioKey", () => {
  it("maps hijack-class and slavic-class buckets", () => {
    expect(intentReasonToPnhMemoryScenarioKey("jailbreak_instruction")).toBe("PROMPT_HIJACK_TRIAD");
    expect(intentReasonToPnhMemoryScenarioKey("low_signal_prompt")).toBe("SLAVIC_SWARM_CREDIT_DRAIN");
    expect(intentReasonToPnhMemoryScenarioKey("too_long")).toBe("INTENT_HARD_GUARD");
  });
});

describe("PnhAttackMemoryStore", () => {
  it("escalates warn → degrade → block on burst same scenario", () => {
    const store = new PnhAttackMemoryStore();
    const t0 = 1_000_000;
    const k = "test-partition";
    const r1 = store.recordIntentFailure(k, "jailbreak_instruction", t0);
    expect(r1.escalationLevel).toBe("warn");
    const r2 = store.recordIntentFailure(k, "jailbreak_instruction", t0 + 1000);
    expect(r2.escalationLevel).toBe("degrade");
    const r3 = store.recordIntentFailure(k, "jailbreak_instruction", t0 + 2000);
    expect(r3.escalationLevel).toBe("degrade");
    const r4 = store.recordIntentFailure(k, "jailbreak_instruction", t0 + 3000);
    expect(r4.escalationLevel).toBe("degrade");
    const r5 = store.recordIntentFailure(k, "jailbreak_instruction", t0 + 4000);
    expect(r5.escalationLevel).toBe("block");
    expect(r5.patterns.some((p) => p.id === "burst_same_scenario")).toBe(true);
  });

  it("detects multi-surface catalog mix in window", () => {
    const store = new PnhAttackMemoryStore();
    const t0 = 2_000_000;
    const k = "p-mix";
    store.recordIntentFailure(k, "jailbreak_instruction", t0);
    const r = store.recordIntentFailure(k, "low_signal_prompt", t0 + 5000);
    expect(r.patterns.some((p) => p.id === "multi_surface_catalog")).toBe(true);
    expect(["degrade", "block"]).toContain(r.escalationLevel);
  });

  it("detects slow-spaced same scenario (APT-style)", () => {
    const store = new PnhAttackMemoryStore();
    const t0 = 5_000_000;
    const k = "p-slow";
    store.recordIntentFailure(k, "jailbreak_instruction", t0);
    store.recordIntentFailure(k, "jailbreak_instruction", t0 + 130_000);
    const r = store.recordIntentFailure(k, "jailbreak_instruction", t0 + 260_000);
    expect(r.patterns.some((p) => p.id === "slow_spacing_same_scenario")).toBe(true);
    expect(levelRankAtLeast(r.escalationLevel, "degrade")).toBe(true);
  });
});

function levelRankAtLeast(
  level: "none" | "warn" | "degrade" | "block",
  min: "degrade"
): boolean {
  const r = { none: 0, warn: 1, degrade: 2, block: 3 };
  return r[level] >= r[min];
}
