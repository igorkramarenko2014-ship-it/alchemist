/**
 * Maps intent-guard outcomes + triad lane + context evaluation → adaptive **advisory** action.
 * **Server triad routes** should remain fail-closed for jailbreak unless explicitly passing **`stub`** lane
 * (demos / Vitest only).
 */
import type { IntentHardenerReason } from "../intent-hardener";
import type { PnhAdaptiveDecision, PnhContextEvaluation, PnhTriadLane } from "./pnh-context-types";
import type { PnhScenarioId } from "./pnh-scenarios";
import { deterministicRuntimeActionForScenarioBreach } from "./pnh-triage-matrix";

type GuardOk = { ok: true };
type GuardFail = { ok: false; reason: IntentHardenerReason; detail?: string };
export type TriadIntentGuardResult = GuardOk | GuardFail;

function mapReasonToScenario(
  reason: IntentHardenerReason
): PnhAdaptiveDecision["scenarioId"] | undefined {
  if (reason === "jailbreak_instruction" || reason === "implausible_param_request") {
    return "PROMPT_HIJACK_TRIAD";
  }
  return undefined;
}

/**
 * Policy table: **`lane`** is dominant for PROMPT_HIJACK-class; repeats escalate in any non-stub lane.
 */
export function pnhAdaptiveDecision(
  guard: TriadIntentGuardResult,
  lane: PnhTriadLane,
  ctx: PnhContextEvaluation,
  opts?: { pnhRepeatTriggersSession?: number }
): PnhAdaptiveDecision {
  if (guard.ok === true) {
    return { action: "allow", reason: "intent_guard_ok" };
  }

  const reason = guard.reason;
  const scenarioId = mapReasonToScenario(reason);
  const repeats = opts?.pnhRepeatTriggersSession ?? 0;
  const repeatEscalate = repeats >= 3 && lane !== "stub";

  // Jailbreak / implausible → scenario PROMPT_HIJACK
  if (reason === "jailbreak_instruction" || reason === "implausible_param_request") {
    if (lane === "stub") {
      return {
        action: "warn",
        reason:
          "stub_lane: classify as PROMPT_HIJACK-class — demo/local stub may proceed; never on live HTTP routes.",
        scenarioId: "PROMPT_HIJACK_TRIAD",
      };
    }
    if (repeatEscalate || ctx.riskLevel === "critical") {
      return {
        action: "block",
        reason: "live_lane: PROMPT_HIJACK-class with elevated fragility or repeated triggers — block.",
        scenarioId: "PROMPT_HIJACK_TRIAD",
      };
    }
    return {
      action: "block",
      reason: "live_lane: PROMPT_HIJACK-class — default block on fetcher/unconfigured_http.",
      scenarioId: "PROMPT_HIJACK_TRIAD",
    };
  }

  // Low-signal / repetition — degrade in safe stub; block-ish on live when critical
  if (reason === "low_signal_prompt" || reason === "pathological_repetition") {
    if (lane === "stub" && ctx.environment === "safe") {
      return {
        action: "degrade",
        reason: "stub_lane + safe context: allow with degraded trust tier (caller should log).",
      };
    }
    if (ctx.riskLevel === "critical" && lane !== "stub") {
      return { action: "block", reason: "fragile live context — treat noise prompts as block." };
    }
    return {
      action: "degrade",
      reason: "default degrade — map to 400 in API unless route policy overrides.",
    };
  }

  // Size / fences / user mode — always block at HTTP boundary
  return {
    action: "block",
    reason: `hard_guard:${reason}`,
    scenarioId,
  };
}

/**
 * Triad HTTP panelist route — **`mixed`** when this process has only partial env keys (inference skew).
 */
export function triadApiPnhLaneFromEnv(
  thisPanelistConfigured: boolean,
  triadFullyLiveOnServer?: boolean
): PnhTriadLane {
  if (!thisPanelistConfigured) return "unconfigured_http";
  if (triadFullyLiveOnServer === false) return "mixed";
  return "fully_live";
}

/**
 * Ghost-run / probe posture: combine **scenario** + **context** (repeats, fragility).
 */
export function pnhAdaptiveScenarioDecision(
  scenarioId: PnhScenarioId,
  probeBreached: boolean,
  lane: PnhTriadLane,
  ctx: PnhContextEvaluation,
  opts?: { gateBypassRepeatAttempts?: number }
): PnhAdaptiveDecision {
  if (!probeBreached) {
    return { action: "allow", reason: "probe_immune", scenarioId };
  }
  const repeats = opts?.gateBypassRepeatAttempts ?? 0;
  const action = deterministicRuntimeActionForScenarioBreach(scenarioId, {
    lane,
    riskLevel: ctx.riskLevel,
    environment: ctx.environment,
    repeats,
  });

  const reason = `PNH triage matrix: ${scenarioId} breach → ${action} (lane=${lane}, risk=${ctx.riskLevel}, env=${ctx.environment}, repeats=${repeats})`;
  return { action, reason, scenarioId };
}
