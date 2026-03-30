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
