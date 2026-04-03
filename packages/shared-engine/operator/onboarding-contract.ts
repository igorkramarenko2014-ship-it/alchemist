import { createDefaultOperatorState } from "./operator-resonance";
import { OperatorId, validateOperatorId } from "./operator-id";
import { OperatorState } from "./operator-types";
import { saveOperatorState, loadOperatorState } from "./operator-shard-manager";

/**
 * Onboarding Contract (Phase 4.0)
 * 
 * Defines the protocol for a new human identity entering the Shigor System.
 * Ensures a fresh operator starts from a clean, compliant resonance baseline.
 */

export async function onboardNewOperator(id: OperatorId): Promise<OperatorState> {
  validateOperatorId(id);

  // 1. Check if already exists to prevent accidental overwrite
  const existing = await loadOperatorState(id);
  if (existing) {
    return existing;
  }

  // 2. Generate clean baseline
  const state = createDefaultOperatorState(id);
  state.source = "manual_seed"; // Explicit onboarding source
  state.updatedAtUtc = new Date().toISOString();

  // 3. Persist Immediately
  await saveOperatorState(state);

  return state;
}
