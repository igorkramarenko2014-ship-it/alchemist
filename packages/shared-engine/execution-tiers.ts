/**
 * **Execution tiers** — classifies IOM power cells so advisory/meta does not read as ship-blocking.
 *
 * - **Tier 1:** user-outcome / hot path (`runTriad`, gates, taxonomy, tablebase short-circuit, export honesty signals).
 * - **Tier 2:** ship-blocking verification (`vst_observer` HARD GATE bridge, release asserts — see scripts, not all are cells).
 * - **Tier 3:** diagnostic only — **no gate mutation, no export authority, no triad override** unless an explicit tested bridge exists.
 *
 * Source: **`execution-tiers.json`**. Guard: **`assertNoAdvisoryMutationBridge`**.
 */
import tierData from "./execution-tiers.json";

export type ExecutionTier = "tier1_hot_path" | "tier2_release_truth" | "tier3_advisory";

export type ExecutionRecommendation =
  | "KEEP"
  | "KEEP_TRANSPARENT_ONLY"
  | "QUARANTINE"
  | "MERGE"
  | "DELETE";

export interface ExecutionTierEntry {
  tier: ExecutionTier;
  recommendation: ExecutionRecommendation;
  advisoryOnly: boolean;
  /** If false, this cell must never directly mutate Tier 1 decisions. */
  hotPathMutable: boolean;
}

export interface ExecutionTierRegistry {
  version: number;
  note: string;
  cells: Record<string, ExecutionTierEntry>;
}

const registry = tierData as ExecutionTierRegistry;

export const EXECUTION_TIER_REGISTRY = registry;
export const EXECUTION_TIER_VERSION = registry.version;
export const EXECUTION_TIER_NOTE = registry.note;

export function getExecutionTierEntry(cellId: string): ExecutionTierEntry | null {
  return registry.cells[cellId] ?? null;
}

export function getExecutionTier(cellId: string): ExecutionTier | null {
  return getExecutionTierEntry(cellId)?.tier ?? null;
}

export function isTier1(cellId: string): boolean {
  return getExecutionTier(cellId) === "tier1_hot_path";
}

export function isTier2(cellId: string): boolean {
  return getExecutionTier(cellId) === "tier2_release_truth";
}

export function isTier3(cellId: string): boolean {
  return getExecutionTier(cellId) === "tier3_advisory";
}

export function isAdvisoryOnlyCell(cellId: string): boolean {
  return Boolean(getExecutionTierEntry(cellId)?.advisoryOnly);
}

/**
 * Loud guardrail for code paths that risk advisory -> hot path mutation.
 * This function is intentionally tiny and pure so callers can use it in tests and runtime guards.
 */
export function assertNoAdvisoryMutationBridge(
  sourceCellId: string,
  targetCellId: string,
): void {
  const src = getExecutionTierEntry(sourceCellId);
  const dst = getExecutionTierEntry(targetCellId);
  if (!src || !dst) return;
  if (src.tier !== "tier3_advisory") return;
  if (dst.tier !== "tier1_hot_path") return;
  if (src.hotPathMutable) return;
  throw new Error(
    `Tier policy violation: advisory cell "${sourceCellId}" cannot mutate Tier 1 cell "${targetCellId}" without an explicit tested bridge.`,
  );
}

export interface ExecutionTierSummary {
  tier1: string[];
  tier2: string[];
  tier3: string[];
}

export function summarizeExecutionTiers(): ExecutionTierSummary {
  const tier1: string[] = [];
  const tier2: string[] = [];
  const tier3: string[] = [];
  for (const [id, e] of Object.entries(registry.cells)) {
    if (e.tier === "tier1_hot_path") tier1.push(id);
    else if (e.tier === "tier2_release_truth") tier2.push(id);
    else tier3.push(id);
  }
  tier1.sort();
  tier2.sort();
  tier3.sort();
  return { tier1, tier2, tier3 };
}

