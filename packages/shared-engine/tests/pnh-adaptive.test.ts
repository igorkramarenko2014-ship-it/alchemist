import { describe, expect, it } from "vitest";
import {
  pnhAdaptiveDecision,
  pnhAdaptiveScenarioDecision,
} from "../pnh/pnh-adaptive";

describe("pnhAdaptiveDecision", () => {
  const elevated = { riskLevel: "elevated" as const, environment: "uncertain" as const };
  const critical = { riskLevel: "critical" as const, environment: "hostile" as const };

  it("PROMPT_HIJACK-class + stub lane → warn", () => {
    const d = pnhAdaptiveDecision(
      { ok: false, reason: "jailbreak_instruction" },
      "stub",
      elevated,
    );
    expect(d.action).toBe("warn");
    expect(d.scenarioId).toBe("PROMPT_HIJACK_TRIAD");
  });

  it("PROMPT_HIJACK-class + fully_live lane → block", () => {
    const d = pnhAdaptiveDecision(
      { ok: false, reason: "jailbreak_instruction" },
      "fully_live",
      elevated,
    );
    expect(d.action).toBe("block");
  });

  it("repeated triggers + live lane keeps jailbreak as block", () => {
    const d = pnhAdaptiveDecision(
      { ok: false, reason: "jailbreak_instruction" },
      "fully_live",
      elevated,
      { pnhRepeatTriggersSession: 4 },
    );
    expect(d.action).toBe("block");
  });

  it("ok guard → allow", () => {
    expect(pnhAdaptiveDecision({ ok: true }, "fully_live", critical).action).toBe("allow");
  });
});

describe("pnhAdaptiveScenarioDecision", () => {
  const ctx = { riskLevel: "elevated" as const, environment: "uncertain" as const };

  it("GATE_BYPASS + repeats escalates to block on live lane", () => {
    const d = pnhAdaptiveScenarioDecision("GATE_BYPASS_PAYLOAD", true, "fully_live", ctx, {
      gateBypassRepeatAttempts: 2,
    });
    expect(d.action).toBe("block");
  });

  it("GATE_BYPASS + no repeats → degrade", () => {
    const d = pnhAdaptiveScenarioDecision("GATE_BYPASS_PAYLOAD", true, "fully_live", ctx);
    expect(d.action).toBe("degrade");
  });

  it("SLAVIC breach + hostile → block", () => {
    const d = pnhAdaptiveScenarioDecision(
      "SLAVIC_SWARM_CREDIT_DRAIN",
      true,
      "fully_live",
      { riskLevel: "critical", environment: "hostile" },
    );
    expect(d.action).toBe("block");
  });
});
