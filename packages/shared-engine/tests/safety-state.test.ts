import { describe, expect, it } from "vitest";

import { evaluateRisk } from "../risk-evaluator";
import {
  acknowledgeSafetyRestriction,
  adminUnlockSafetyState,
  applyRiskEvaluation,
  createInitialSafetyState,
  DEFAULT_SAFETY_STATE_CONFIG,
  expireSafetyRestriction,
  formatRestrictedModeMessage,
  formatWarningMessage,
} from "../safety-state";

describe("safety restriction state", () => {
  it("shows a warning on first medium-risk event", () => {
    const result = applyRiskEvaluation(
      createInitialSafetyState(),
      evaluateRisk({
        eventId: "evt_warning",
        source: "prompt",
        category: "unsafe_request",
        detail: "request attempts unsafe action guidance",
      }),
      new Date("2026-03-30T10:00:00.000Z"),
    );

    expect(result.nextState.state).toBe("WARNED");
    expect(result.visibleMessage).toContain("This behavior appears to request unsafe or disallowed actions.");
    expect(result.visibleMessage).toContain("Triggered by:");
    expect(result.auditEntries).toHaveLength(1);
  });

  it("escalates repeated medium-risk events into temporary restriction", () => {
    const first = applyRiskEvaluation(
      createInitialSafetyState(),
      evaluateRisk({
        eventId: "evt_m1",
        source: "prompt",
        category: "unsafe_request",
        detail: "first unsafe request",
      }),
      new Date("2026-03-30T10:00:00.000Z"),
    );
    const second = applyRiskEvaluation(
      first.nextState,
      evaluateRisk({
        eventId: "evt_m2",
        source: "prompt",
        category: "disallowed_action",
        detail: "repeated unsafe request",
      }),
      new Date("2026-03-30T10:01:00.000Z"),
    );

    expect(second.nextState.state).toBe("RESTRICTED_TEMP");
    expect(second.nextState.sensitiveCapabilitiesDisabled).toEqual(
      DEFAULT_SAFETY_STATE_CONFIG.restrictedCapabilities,
    );
    expect(second.visibleMessage).toContain("Sensitive features have been temporarily restricted");
    expect(second.auditEntries[0]?.durationMs).toBe(DEFAULT_SAFETY_STATE_CONFIG.restrictedDurationMs);
  });

  it("auto-expires temporary restrictions", () => {
    const restricted = applyRiskEvaluation(
      createInitialSafetyState(),
      evaluateRisk({
        eventId: "evt_high",
        source: "prompt",
        category: "harmful_action",
        detail: "harmful behavior request",
      }),
      new Date("2026-03-30T10:00:00.000Z"),
    );
    const expired = expireSafetyRestriction(
      restricted.nextState,
      new Date("2026-03-30T10:20:01.000Z"),
    );

    expect(restricted.nextState.state).toBe("RESTRICTED_TEMP");
    expect(expired.nextState.state).toBe("NORMAL");
    expect(expired.auditEntries[0]?.action).toBe("AUTO_EXPIRED");
  });

  it("supports admin restore", () => {
    const restricted = applyRiskEvaluation(
      createInitialSafetyState(),
      evaluateRisk({
        eventId: "evt_admin",
        source: "prompt",
        category: "harmful_action",
        detail: "harmful behavior request",
      }),
      new Date("2026-03-30T10:00:00.000Z"),
    );
    const restored = adminUnlockSafetyState(
      restricted.nextState,
      new Date("2026-03-30T10:05:00.000Z"),
    );

    expect(restored.nextState.state).toBe("NORMAL");
    expect(restored.auditEntries[0]?.action).toBe("ADMIN_UNLOCK");
  });

  it("supports acknowledgment restore when enabled", () => {
    const restricted = applyRiskEvaluation(
      createInitialSafetyState(),
      evaluateRisk({
        eventId: "evt_ack",
        source: "prompt",
        category: "harmful_action",
        detail: "harmful behavior request",
      }),
      new Date("2026-03-30T10:00:00.000Z"),
      {
        ...DEFAULT_SAFETY_STATE_CONFIG,
        userAcknowledgmentUnlockEnabled: true,
      },
    );
    const restored = acknowledgeSafetyRestriction(
      restricted.nextState,
      new Date("2026-03-30T10:02:00.000Z"),
      {
        ...DEFAULT_SAFETY_STATE_CONFIG,
        userAcknowledgmentUnlockEnabled: true,
      },
    );

    expect(restored.nextState.state).toBe("NORMAL");
    expect(restored.auditEntries[0]?.action).toBe("USER_ACK_UNLOCK");
  });

  it("does not restrict safe behavior", () => {
    const result = applyRiskEvaluation(
      createInitialSafetyState(),
      evaluateRisk({
        eventId: "evt_safe",
        source: "prompt",
        category: "safe_behavior",
        detail: "sound-design request",
      }),
      new Date("2026-03-30T10:00:00.000Z"),
    );

    expect(result.nextState.state).toBe("NORMAL");
    expect(result.auditEntries).toHaveLength(0);
  });

  it("renders the configured message templates", () => {
    expect(
      formatWarningMessage("unsafe request pattern", "keep requests within allowed use"),
    ).toContain("This behavior appears to request unsafe or disallowed actions.");
    expect(formatRestrictedModeMessage("2026-03-30T10:15:00.000Z")).toContain(
      "This restriction will expire at 2026-03-30T10:15:00.000Z.",
    );
  });
});
