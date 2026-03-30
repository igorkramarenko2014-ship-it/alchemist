import type { RiskEvaluation } from "./risk-evaluator";

export type SafetyState =
  | "NORMAL"
  | "WARNED"
  | "RESTRICTED_TEMP"
  | "SUSPENDED_REVIEW";

export type SensitiveCapability =
  | "triad_live_fetch"
  | "preset_share"
  | "fxp_export";

export type SafetyAuditAction =
  | "WARNING_SHOWN"
  | "RESTRICTED_TEMP_ENABLED"
  | "AUTO_EXPIRED"
  | "ADMIN_UNLOCK"
  | "USER_ACK_UNLOCK";

export type SafetyStateConfig = {
  mediumRiskEscalationThreshold: number;
  restrictedDurationMs: number;
  userAcknowledgmentUnlockEnabled: boolean;
  restrictedCapabilities: SensitiveCapability[];
};

export type SafetyAuditEntry = {
  action: SafetyAuditAction;
  state: SafetyState;
  reason: string;
  behaviorSummary: string;
  continueSafelyMessage?: string;
  timestampUtc: string;
  durationMs?: number;
  expiresAtUtc?: string;
  restrictedCapabilities?: SensitiveCapability[];
  eventId: string;
};

export type SafetyRestrictionState = {
  state: SafetyState;
  mediumRiskCount: number;
  sensitiveCapabilitiesDisabled: SensitiveCapability[];
  warningMessage: string | null;
  restrictedMessage: string | null;
  lastReason: string | null;
  lastBehaviorSummary: string | null;
  lastRiskLevel: RiskEvaluation["riskLevel"] | null;
  restrictedUntilUtc: string | null;
  lastUpdatedUtc: string | null;
};

export type SafetyTransitionResult = {
  nextState: SafetyRestrictionState;
  visibleMessage: string | null;
  auditEntries: SafetyAuditEntry[];
};

export const USER_WARNING_MESSAGE_TEMPLATE =
  "This behavior appears to request unsafe or disallowed actions. If it continues, some features will be temporarily restricted to prevent harm. You can continue by keeping requests within allowed use.";

export const RESTRICTED_MODE_MESSAGE_TEMPLATE =
  "Sensitive features have been temporarily restricted because of repeated unsafe requests. Core safe functionality remains available. This restriction will expire at <time>.";

export const DEFAULT_SAFETY_STATE_CONFIG: SafetyStateConfig = {
  mediumRiskEscalationThreshold: 2,
  restrictedDurationMs: 15 * 60 * 1000,
  userAcknowledgmentUnlockEnabled: false,
  restrictedCapabilities: ["triad_live_fetch", "preset_share", "fxp_export"],
};

export function createInitialSafetyState(): SafetyRestrictionState {
  return {
    state: "NORMAL",
    mediumRiskCount: 0,
    sensitiveCapabilitiesDisabled: [],
    warningMessage: null,
    restrictedMessage: null,
    lastReason: null,
    lastBehaviorSummary: null,
    lastRiskLevel: null,
    restrictedUntilUtc: null,
    lastUpdatedUtc: null,
  };
}

export function resolveSafetyStateConfig(
  env: Record<string, string | undefined> = process.env,
): SafetyStateConfig {
  return {
    mediumRiskEscalationThreshold: parsePositiveInt(
      env.ALCHEMIST_SAFETY_MEDIUM_THRESHOLD,
      DEFAULT_SAFETY_STATE_CONFIG.mediumRiskEscalationThreshold,
    ),
    restrictedDurationMs: parsePositiveInt(
      env.ALCHEMIST_SAFETY_RESTRICT_MS,
      DEFAULT_SAFETY_STATE_CONFIG.restrictedDurationMs,
    ),
    userAcknowledgmentUnlockEnabled:
      env.ALCHEMIST_SAFETY_ACK_UNLOCK === "1"
        ? true
        : DEFAULT_SAFETY_STATE_CONFIG.userAcknowledgmentUnlockEnabled,
    restrictedCapabilities:
      env.ALCHEMIST_SAFETY_RESTRICTED_CAPABILITIES?.split(",")
        .map((value) => value.trim())
        .filter(isSensitiveCapability) ??
      DEFAULT_SAFETY_STATE_CONFIG.restrictedCapabilities,
  };
}

export function applyRiskEvaluation(
  currentState: SafetyRestrictionState,
  evaluation: RiskEvaluation,
  now = new Date(),
  config: SafetyStateConfig = DEFAULT_SAFETY_STATE_CONFIG,
): SafetyTransitionResult {
  const baseState = expireRestrictionIfNeeded(currentState, now, {
    eventId: evaluation.eventId,
    reason: "Temporary restriction expired automatically.",
  });
  const auditEntries = [...baseState.auditEntries];
  const state = baseState.state;

  if (evaluation.riskLevel === "NONE" || evaluation.riskLevel === "LOW") {
    return {
      nextState: {
        ...state,
        lastRiskLevel: evaluation.riskLevel,
        lastUpdatedUtc: now.toISOString(),
      },
      visibleMessage: null,
      auditEntries,
    };
  }

  if (evaluation.riskLevel === "MEDIUM") {
    const mediumRiskCount = state.mediumRiskCount + 1;
    if (mediumRiskCount < config.mediumRiskEscalationThreshold) {
      const warningMessage = formatWarningMessage(
        evaluation.behaviorSummary,
        evaluation.continueSafelyMessage,
      );
      auditEntries.push({
        action: "WARNING_SHOWN",
        state: "WARNED",
        reason: "First medium-risk warning.",
        behaviorSummary: evaluation.behaviorSummary,
        continueSafelyMessage: evaluation.continueSafelyMessage,
        timestampUtc: now.toISOString(),
        eventId: evaluation.eventId,
      });
      return {
        nextState: {
          ...state,
          state: "WARNED",
          mediumRiskCount,
          warningMessage,
          restrictedMessage: null,
          lastReason: "First medium-risk warning.",
          lastBehaviorSummary: evaluation.behaviorSummary,
          lastRiskLevel: evaluation.riskLevel,
          lastUpdatedUtc: now.toISOString(),
        },
        visibleMessage: warningMessage,
        auditEntries,
      };
    }

    const restricted = enableTemporaryRestriction(
      state,
      now,
      config,
      evaluation,
      "Repeated medium-risk behavior triggered temporary restriction.",
    );
    return {
      nextState: restricted.nextState,
      visibleMessage: restricted.nextState.restrictedMessage,
      auditEntries: [...auditEntries, restricted.auditEntry],
    };
  }

  const restricted = enableTemporaryRestriction(
    state,
    now,
    config,
    evaluation,
    "High-risk behavior triggered immediate temporary restriction.",
  );
  return {
    nextState: restricted.nextState,
    visibleMessage: restricted.nextState.restrictedMessage,
    auditEntries: [...auditEntries, restricted.auditEntry],
  };
}

export function adminUnlockSafetyState(
  currentState: SafetyRestrictionState,
  now = new Date(),
  reason = "Admin restored access after review.",
): SafetyTransitionResult {
  const nextState = {
    ...createInitialSafetyState(),
    lastReason: reason,
    lastUpdatedUtc: now.toISOString(),
  };
  return {
    nextState,
    visibleMessage: null,
    auditEntries: [
      {
        action: "ADMIN_UNLOCK",
        state: "NORMAL",
        reason,
        behaviorSummary: currentState.lastBehaviorSummary ?? "n/a",
        timestampUtc: now.toISOString(),
        eventId: "admin_unlock",
      },
    ],
  };
}

export function acknowledgeSafetyRestriction(
  currentState: SafetyRestrictionState,
  now = new Date(),
  config: SafetyStateConfig = DEFAULT_SAFETY_STATE_CONFIG,
): SafetyTransitionResult {
  if (!config.userAcknowledgmentUnlockEnabled || currentState.state !== "RESTRICTED_TEMP") {
    return { nextState: currentState, visibleMessage: null, auditEntries: [] };
  }
  const nextState = {
    ...createInitialSafetyState(),
    lastReason: "User acknowledged the warning and restriction was cleared.",
    lastUpdatedUtc: now.toISOString(),
  };
  return {
    nextState,
    visibleMessage: null,
    auditEntries: [
      {
        action: "USER_ACK_UNLOCK",
        state: "NORMAL",
        reason: "User acknowledged the restriction flow.",
        behaviorSummary: currentState.lastBehaviorSummary ?? "n/a",
        timestampUtc: now.toISOString(),
        eventId: "user_ack_unlock",
      },
    ],
  };
}

export function expireSafetyRestriction(
  currentState: SafetyRestrictionState,
  now = new Date(),
): SafetyTransitionResult {
  const result = expireRestrictionIfNeeded(currentState, now, {
    eventId: "auto_expire",
    reason: "Temporary restriction expired automatically.",
  });
  return {
    nextState: result.state,
    visibleMessage: null,
    auditEntries: result.auditEntries,
  };
}

export function formatWarningMessage(
  behaviorSummary: string,
  continueSafelyMessage: string,
): string {
  return `${USER_WARNING_MESSAGE_TEMPLATE} Triggered by: ${behaviorSummary} Continue safely: ${continueSafelyMessage}`;
}

export function formatRestrictedModeMessage(expiresAtUtc: string): string {
  return RESTRICTED_MODE_MESSAGE_TEMPLATE.replace("<time>", expiresAtUtc);
}

function enableTemporaryRestriction(
  state: SafetyRestrictionState,
  now: Date,
  config: SafetyStateConfig,
  evaluation: RiskEvaluation,
  reason: string,
): { nextState: SafetyRestrictionState; auditEntry: SafetyAuditEntry } {
  const expiresAtUtc = new Date(now.getTime() + config.restrictedDurationMs).toISOString();
  const restrictedMessage = formatRestrictedModeMessage(expiresAtUtc);
  return {
    nextState: {
      ...state,
      state: "RESTRICTED_TEMP",
      mediumRiskCount:
        evaluation.riskLevel === "MEDIUM" ? state.mediumRiskCount + 1 : state.mediumRiskCount,
      sensitiveCapabilitiesDisabled: [...config.restrictedCapabilities],
      warningMessage: null,
      restrictedMessage,
      restrictedUntilUtc: expiresAtUtc,
      lastReason: reason,
      lastBehaviorSummary: evaluation.behaviorSummary,
      lastRiskLevel: evaluation.riskLevel,
      lastUpdatedUtc: now.toISOString(),
    },
    auditEntry: {
      action: "RESTRICTED_TEMP_ENABLED",
      state: "RESTRICTED_TEMP",
      reason,
      behaviorSummary: evaluation.behaviorSummary,
      continueSafelyMessage: evaluation.continueSafelyMessage,
      timestampUtc: now.toISOString(),
      durationMs: config.restrictedDurationMs,
      expiresAtUtc,
      restrictedCapabilities: [...config.restrictedCapabilities],
      eventId: evaluation.eventId,
    },
  };
}

function expireRestrictionIfNeeded(
  currentState: SafetyRestrictionState,
  now: Date,
  meta: { eventId: string; reason: string },
): { state: SafetyRestrictionState; auditEntries: SafetyAuditEntry[] } {
  if (
    currentState.state !== "RESTRICTED_TEMP" ||
    currentState.restrictedUntilUtc === null ||
    Date.parse(currentState.restrictedUntilUtc) > now.getTime()
  ) {
    return { state: currentState, auditEntries: [] };
  }

  return {
    state: {
      ...createInitialSafetyState(),
      lastReason: meta.reason,
      lastBehaviorSummary: currentState.lastBehaviorSummary,
      lastRiskLevel: currentState.lastRiskLevel,
      lastUpdatedUtc: now.toISOString(),
    },
    auditEntries: [
      {
        action: "AUTO_EXPIRED",
        state: "NORMAL",
        reason: meta.reason,
        behaviorSummary: currentState.lastBehaviorSummary ?? "n/a",
        timestampUtc: now.toISOString(),
        eventId: meta.eventId,
      },
    ],
  };
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.round(parsed);
}

function isSensitiveCapability(value: string): value is SensitiveCapability {
  return value === "triad_live_fetch" || value === "preset_share" || value === "fxp_export";
}
