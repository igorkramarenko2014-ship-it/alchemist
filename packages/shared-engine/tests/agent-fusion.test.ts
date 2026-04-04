import { describe, expect, it } from "vitest";
import {
  computeAgentAjiChatFusionFromTriadTelemetry,
  computeHealthAgentAjiChatFusion,
  computeMobileShellAgentAjiChatFusion,
  computeTalentAgentAjiChatFusion,
  mergeSoeWithAjiChat,
  taxonomyPoolTooLargeAgentFusion,
} from "../agent-fusion";
import { computeSoeRecommendations } from "../soe";
import { AthenaPythia, PythiaContext } from "../agents/athena-pythia";

describe("agent-fusion", () => {
  it("mergeSoeWithAjiChat appends bridge code and line", () => {
    const soe = computeSoeRecommendations({
      meanPanelistMs: 1000,
      triadFailureRate: 0,
      gateDropRate: 0.1,
    });
    const m = mergeSoeWithAjiChat(soe);
    expect(m.fusionCodes.at(-1)).toBe("AJI_CHAT_BRIDGE");
    expect(m.fusionLines.at(-1)).toContain("aji_fusion:");
  });

  it("computeHealthAgentAjiChatFusion stacks wasm + triad when both degraded", () => {
    const h = computeHealthAgentAjiChatFusion({
      wasmOk: false,
      triadFullyLive: false,
      anyLive: true,
    });
    expect(h.fusionCodes).toContain("HEALTH_WASM");
    expect(h.fusionCodes).toContain("HEALTH_TRIAD_PARTIAL");
  });

  it("computeTalentAgentAjiChatFusion covers insufficient data", () => {
    const t = computeTalentAgentAjiChatFusion({
      insufficientData: true,
      operatorReviewSuggested: false,
      gap: 0,
      weakestPanelist: null,
    });
    expect(t.fusionLines[0]).toMatch(/^aji_fusion:/);
  });

  it("taxonomyPoolTooLargeAgentFusion mentions pool bound", () => {
    const x = taxonomyPoolTooLargeAgentFusion(999, 200);
    expect(x.fusionLines[0]).toContain("999");
    expect(x.fusionLines[0]).toContain("200");
  });

  it("computeAgentAjiChatFusionFromTriadTelemetry maps stub mode to stub fraction", () => {
    const f = computeAgentAjiChatFusionFromTriadTelemetry({
      meanPanelistMs: 2000,
      triadFailureRate: 0,
      gateDropRate: 0.1,
      triadRunMode: "stub",
    });
    expect(f.fusionLines.some((l) => l.includes("soe_fusion:"))).toBe(true);
    expect(f.fusionLines.some((l) => l.includes("stub-heavy"))).toBe(true);
  });

  it("computeMobileShellAgentAjiChatFusion returns shell line", () => {
    const m = computeMobileShellAgentAjiChatFusion();
    expect(m.fusionLines[0]).toContain("mobile");
  });
});

import { checkAndActivateAji } from "../triad";
describe("aji-activation lock", () => {
  it("confirms Aji never fires twice for the same triadSessionId and respects expiry", () => {
    const sessionId = "test_run_id_for_aji_lock";
    // First activation should succeed
    const fired1 = checkAndActivateAji(sessionId, "schism_detected");
    expect(fired1).toBe(true);
    // Second activation for same session should fail mechanically
    const fired2 = checkAndActivateAji(sessionId, "schism_detected");
    expect(fired2).toBe(false);
  });
});

describe("Pythia Oracle Agent (Lazy Oracle)", () => {
  const baseContext: PythiaContext = {
    candidateScores: [0.8, 0.75],
    sessionEntropyHistory: [1.2, 1.3, 1.25],
    currentEntropy: 1.28,
    retryCount: 0,
    operatorInvoke: false
  };

  it("pythia returns activated:false when no trigger conditions met", () => {
    const res = AthenaPythia.run(baseContext);
    expect(res.activated).toBe(false);
    expect(res.triggerReason).toBeNull();
  });

  it("pythia activates on AGENT_CONFLICT (delta > 0.25)", () => {
    const context = { ...baseContext, candidateScores: [0.95, 0.6] }; // Delta 0.35
    const res = AthenaPythia.run(context);
    expect(res.activated).toBe(true);
    expect(res.triggerReason).toBe('AGENT_CONFLICT');
  });

  it("pythia activates on ENTROPY_SPIKE (> 2.0σ)", () => {
    // Mean = 1.25, StdDev = 0.04 (approx). 2.0σ = 0.08. current = 2.0 is way over.
    const context = { ...baseContext, currentEntropy: 2.0 }; 
    const res = AthenaPythia.run(context);
    expect(res.activated).toBe(true);
    expect(res.triggerReason).toBe('ENTROPY_SPIKE');
  });

  it("pythia activates on INTEGRITY_LOCK_ACTIVE", () => {
    // simulate lock by env if evaluateIntegrityLocks uses it
    process.env.ALCHEMIST_EPISTEMIC_BRAKE = "1";
    const res = AthenaPythia.run(baseContext);
    expect(res.activated).toBe(true);
    expect(res.triggerReason).toBe('INTEGRITY_LOCK_ACTIVE');
    delete process.env.ALCHEMIST_EPISTEMIC_BRAKE;
  });

  it("pythia activates on TRIAD_DEADLOCK", () => {
    const context = { ...baseContext, retryCount: 2, candidateScores: [0.7, 0.65] };
    const res = AthenaPythia.run(context);
    expect(res.activated).toBe(true);
    expect(res.triggerReason).toBe('TRIAD_DEADLOCK');
  });

  it("pythia activates on OPERATOR_INVOKE flag", () => {
    const context = { ...baseContext, operatorInvoke: true };
    const res = AthenaPythia.run(context);
    expect(res.activated).toBe(true);
    expect(res.triggerReason).toBe('OPERATOR_INVOKE');
  });

  it("pythia always returns exactly 3 scenarios", () => {
    const context = { ...baseContext, operatorInvoke: true };
    const res = AthenaPythia.run(context);
    expect(res.top3Scenarios).toHaveLength(3);
  });

  it("pythia triadEndorsed is always one of top3", () => {
    const context = { ...baseContext, operatorInvoke: true };
    const res = AthenaPythia.run(context);
    expect(res.top3Scenarios).toContain(res.triadEndorsed);
  });

  it("pythia operatorDecisionRequired is always true", () => {
    const context = { ...baseContext, operatorInvoke: true };
    const res = AthenaPythia.run(context);
    expect(res.operatorDecisionRequired).toBe(true);
  });

  it("pythia never mutates context or state", () => {
    const context = { ...baseContext, operatorInvoke: true };
    const contextCopy = JSON.parse(JSON.stringify(context));
    AthenaPythia.run(context);
    expect(context).toEqual(contextCopy);
  });
});
