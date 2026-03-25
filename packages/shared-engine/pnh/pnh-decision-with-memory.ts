/**
 * **`pnhDecision = f(currentScenario, sessionState)`** — merges context-aware adaptive policy with attack memory.
 */
import type { PnhAdaptiveDecision, PnhContextEvaluation, PnhTriadLane } from "./pnh-context-types";
import { pnhAdaptiveDecision } from "./pnh-adaptive";
import type { IntentHardenerReason } from "../intent-hardener";
import {
  escalationLevelToActionFloor,
  maxPnhAdaptiveAction,
  type PnhAttackMemoryStore,
  type PnhMemoryInspection,
} from "./pnh-attack-memory";

export interface PnhDecisionWithMemory extends PnhAdaptiveDecision {
  readonly memory: PnhMemoryInspection;
  readonly escalationLevel: PnhMemoryInspection["escalationLevel"];
  readonly patterns: PnhMemoryInspection["patterns"];
  /** Action after applying memory floor (stricter of adaptive vs memory tier). */
  readonly effectiveAction: PnhAdaptiveDecision["action"];
}

/**
 * Record intent failure into **`store`**, then compute adaptive decision with repeat counts from snapshot.
 */
export function pnhIntentFailureDecisionWithMemory(
  partitionKey: string,
  guard: { ok: false; reason: IntentHardenerReason; detail?: string },
  lane: PnhTriadLane,
  ctx: PnhContextEvaluation,
  store: PnhAttackMemoryStore,
  nowMs?: number
): PnhDecisionWithMemory {
  const memory = store.recordIntentFailure(partitionKey, guard.reason, nowMs);
  const scenarioKey = memory.snapshot.recentEvents[memory.snapshot.recentEvents.length - 1]!.scenarioKey;
  const burstCount = memory.snapshot.scenarioCountsBurst[scenarioKey] ?? 0;

  const base = pnhAdaptiveDecision(guard, lane, ctx, {
    pnhRepeatTriggersSession: burstCount,
  });

  const floor = escalationLevelToActionFloor(memory.escalationLevel);
  const effectiveAction = maxPnhAdaptiveAction(base.action, floor);

  return {
    ...base,
    effectiveAction,
    memory,
    escalationLevel: memory.escalationLevel,
    patterns: memory.patterns,
  };
}
