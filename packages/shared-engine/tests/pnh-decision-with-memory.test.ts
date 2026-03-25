import { describe, expect, it, afterEach } from "vitest";
import { PnhAttackMemoryStore, resetPnhAttackMemoryForTests } from "../pnh/pnh-attack-memory";
import { pnhIntentFailureDecisionWithMemory } from "../pnh/pnh-decision-with-memory";

afterEach(() => {
  resetPnhAttackMemoryForTests();
});

describe("pnhIntentFailureDecisionWithMemory", () => {
  it("raises effectiveAction when memory floor exceeds stub warn", () => {
    const store = new PnhAttackMemoryStore();
    const ctx = { riskLevel: "low" as const, environment: "safe" as const };
    const guard = { ok: false as const, reason: "jailbreak_instruction" as const };
    const t0 = 8_000_000;
    const k = "stub-part";
    store.recordIntentFailure(k, "jailbreak_instruction", t0);
    store.recordIntentFailure(k, "jailbreak_instruction", t0 + 500);
    const decision = pnhIntentFailureDecisionWithMemory(k, guard, "stub", ctx, store, t0 + 1000);
    expect(decision.action).toBe("warn");
    expect(decision.effectiveAction).toBe("degrade");
    expect(decision.escalationLevel).toBe("degrade");
  });

  it("keeps block when adaptive already block on live lane", () => {
    const store = new PnhAttackMemoryStore();
    const ctx = { riskLevel: "low" as const, environment: "safe" as const };
    const guard = { ok: false as const, reason: "jailbreak_instruction" as const };
    const d = pnhIntentFailureDecisionWithMemory("live", guard, "fully_live", ctx, store);
    expect(d.effectiveAction).toBe("block");
    expect(d.action).toBe("block");
  });
});
