export type RiskLevel = "NONE" | "LOW" | "MEDIUM" | "HIGH";

export type SafetyEventCategory =
  | "safe_behavior"
  | "policy_warning"
  | "unsafe_request"
  | "disallowed_action"
  | "harmful_action"
  | "admin_review_flag";

export type SafetyEvent = {
  eventId: string;
  source: "prompt" | "feature" | "system" | "admin";
  category: SafetyEventCategory;
  detail: string;
  userVisibleBehavior?: string;
  safeContinuation?: string;
};

export type RiskEvaluation = {
  riskLevel: RiskLevel;
  behaviorSummary: string;
  continueSafelyMessage: string;
  eventId: string;
  source: SafetyEvent["source"];
  category: SafetyEventCategory;
};

const CATEGORY_TO_RISK: Record<SafetyEventCategory, RiskLevel> = {
  safe_behavior: "NONE",
  policy_warning: "LOW",
  unsafe_request: "MEDIUM",
  disallowed_action: "MEDIUM",
  harmful_action: "HIGH",
  admin_review_flag: "HIGH",
};

const DEFAULT_CONTINUE_SAFELY =
  "Continue by keeping requests within allowed, non-harmful use.";

export function evaluateRisk(event: SafetyEvent): RiskEvaluation {
  return {
    riskLevel: CATEGORY_TO_RISK[event.category],
    behaviorSummary: sanitizeSafetyText(
      event.userVisibleBehavior && event.userVisibleBehavior.trim().length > 0
        ? event.userVisibleBehavior
        : event.detail,
    ),
    continueSafelyMessage: sanitizeSafetyText(
      event.safeContinuation && event.safeContinuation.trim().length > 0
        ? event.safeContinuation
        : DEFAULT_CONTINUE_SAFELY,
    ),
    eventId: event.eventId,
    source: event.source,
    category: event.category,
  };
}

function sanitizeSafetyText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}
