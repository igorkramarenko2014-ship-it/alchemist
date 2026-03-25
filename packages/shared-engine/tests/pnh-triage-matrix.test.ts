import { describe, expect, it } from "vitest";
import {
  deterministicRuntimeActionForScenarioBreach,
  securityVerdictFromTriageState,
  severityFromFindingId,
  triagePolicyForFindingId,
  verifyOutcomeFromFindingId,
} from "../pnh/pnh-triage-matrix";
import { pnhAdaptiveScenarioDecision } from "../pnh/pnh-adaptive";

describe("PNH triage matrix — deterministic policy", () => {
  it("GATE_BYPASS_PAYLOAD breach: repeats>=2 live => block", () => {
    const action = deterministicRuntimeActionForScenarioBreach("GATE_BYPASS_PAYLOAD", {
      lane: "fully_live",
      riskLevel: "low",
      environment: "safe",
      repeats: 2,
    });
    expect(action).toBe("block");
  });

  it("GATE_BYPASS_PAYLOAD breach: repeats<2 live => degrade", () => {
    const action = deterministicRuntimeActionForScenarioBreach("GATE_BYPASS_PAYLOAD", {
      lane: "fully_live",
      riskLevel: "low",
      environment: "safe",
      repeats: 1,
    });
    expect(action).toBe("degrade");
  });

  it("GATE_BYPASS_PAYLOAD breach: critical risk => block", () => {
    const action = deterministicRuntimeActionForScenarioBreach("GATE_BYPASS_PAYLOAD", {
      lane: "fully_live",
      riskLevel: "critical",
      environment: "safe",
      repeats: 0,
    });
    expect(action).toBe("block");
  });

  it("PROMPT_HIJACK_TRIAD breach: stub => warn, live => block", () => {
    const stubAction = deterministicRuntimeActionForScenarioBreach("PROMPT_HIJACK_TRIAD", {
      lane: "stub",
      riskLevel: "low",
      environment: "safe",
      repeats: 10,
    });
    expect(stubAction).toBe("warn");

    const liveAction = deterministicRuntimeActionForScenarioBreach("PROMPT_HIJACK_TRIAD", {
      lane: "fully_live",
      riskLevel: "low",
      environment: "safe",
      repeats: 0,
    });
    expect(liveAction).toBe("block");
  });

  it("SLAVIC_SWARM_CREDIT_DRAIN breach: hostile or repeats>=2 => block", () => {
    const hostileAction = deterministicRuntimeActionForScenarioBreach(
      "SLAVIC_SWARM_CREDIT_DRAIN",
      { lane: "fully_live", riskLevel: "low", environment: "hostile", repeats: 0 },
    );
    expect(hostileAction).toBe("block");

    const repeatAction = deterministicRuntimeActionForScenarioBreach("SLAVIC_SWARM_CREDIT_DRAIN", {
      lane: "fully_live",
      riskLevel: "low",
      environment: "safe",
      repeats: 2,
    });
    expect(repeatAction).toBe("block");

    const defaultAction = deterministicRuntimeActionForScenarioBreach("SLAVIC_SWARM_CREDIT_DRAIN", {
      lane: "fully_live",
      riskLevel: "low",
      environment: "safe",
      repeats: 0,
    });
    expect(defaultAction).toBe("degrade");
  });

  it("verifyOutcomeFromFindingId: ghost + warfare + apt are policy-driven", () => {
    expect(verifyOutcomeFromFindingId("ghost:GATE_BYPASS_PAYLOAD:param_out_of_range")).toBe("fail");
    expect(verifyOutcomeFromFindingId("ghost:PROMPT_HIJACK_TRIAD:prompt_markers_DEEPSEEK")).toBe("fail");
    expect(verifyOutcomeFromFindingId("ghost:SLAVIC_SWARM_CREDIT_DRAIN:identical_param_swarm")).toBe(
      "degraded",
    );

    expect(verifyOutcomeFromFindingId("warfare:A1")).toBe("degraded");
    expect(verifyOutcomeFromFindingId("warfare:B4")).toBe("fail");
    expect(verifyOutcomeFromFindingId("warfare:C9")).toBe("pass");

    expect(verifyOutcomeFromFindingId("apt:bamboo_sprout")).toBe("pass");
  });

  it("securityVerdictFromTriageState is deterministic", () => {
    expect(securityVerdictFromTriageState("clean")).toBe("pass");
    expect(securityVerdictFromTriageState("warning")).toBe("degraded");
    expect(securityVerdictFromTriageState("breach")).toBe("fail");
  });

  it("severityFromFindingId aligns with policy severity", () => {
    const p = triagePolicyForFindingId("warfare:C9");
    expect(p?.severity).toBe("info");
    expect(severityFromFindingId("warfare:C9")).toBe("info");
  });

  it("triad adaptive decision aligns with triage matrix actions", () => {
    const ctx = { environment: "safe", riskLevel: "low" } as const;
    const lane = "fully_live" as const;
    const scenarioId = "GATE_BYPASS_PAYLOAD" as const;

    const actionFromMatrix = deterministicRuntimeActionForScenarioBreach(scenarioId, {
      lane,
      riskLevel: ctx.riskLevel,
      environment: ctx.environment,
      repeats: 2,
    });

    const actionFromTriadLayer = pnhAdaptiveScenarioDecision(scenarioId, true, lane, ctx, {
      gateBypassRepeatAttempts: 2,
    }).action;

    expect(actionFromTriadLayer).toBe(actionFromMatrix);
  });
});

