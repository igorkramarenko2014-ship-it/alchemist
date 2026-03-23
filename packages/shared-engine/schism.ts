/**
 * Schism generator — **telemetry + sprint narrative only**.
 * Does **not** randomize, invert, or bypass production gates (Gatekeeper, Slavic, Undercover).
 * Polarity picks a *documented direction* for the next sprint; implementation stays deterministic TS.
 */
import { logSprintComplete } from "./integrity";
import { logEvent } from "./telemetry";

export const Polarity = {
  CONSOLIDATE: "CONSOLIDATE",
  DISRUPT: "DISRUPT",
} as const;
export type Polarity = (typeof Polarity)[keyof typeof Polarity];

/** Canonical name for the telemetry / score-stream gate family. */
export const SCHISM_MODULE_GATEKEEPER = "gatekeeper";

/** Growth at/above this (0–10 scale) selects DISRUPT; below selects CONSOLIDATE. */
export const SCHISM_DEFAULT_GROWTH_THRESHOLD = 5.5;

/** Half-width (growth units) for tension: near threshold ⇒ high existential weight. */
export const SCHISM_TENSION_BAND = 2.5;

export interface ModuleState {
  moduleName: string;
  /**
   * Historical performance roll-up (clamp 0–10 internally).
   * Low → consolidate; high → disrupt (creative *probes*, not live gate inversion).
   */
  growthLevel: number;
  /** Override default threshold (same 0–10 scale). */
  growthThreshold?: number;
}

export interface ExistentialChoice {
  moduleName: string;
  split: Record<Polarity, string>;
  chosen: Polarity;
  growthLevel: number;
  growthThreshold: number;
  /** How “costly” the fork felt: 1 at the threshold, ~0 far away (bipolar gap was obvious). */
  existentialWeight: number;
  /** Scalar echo for dashboards; not a model weight. */
  growthImpact: number;
}

function clampGrowth(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(10, n));
}

function defaultSplit(moduleName: string): Record<Polarity, string> {
  const key = moduleName.trim().toLowerCase();
  if (key === SCHISM_MODULE_GATEKEEPER) {
    return {
      [Polarity.CONSOLIDATE]:
        "Consolidator: tighten IQR/Z + duration telemetry; reduce false positives in score-stream gates.",
      [Polarity.DISRUPT]:
        "Disruptor: mine STATUS_NOISY + creativePivot residue for QA narratives — never ship inverted gate math without HARD GATE proof.",
    };
  }
  return {
    [Polarity.CONSOLIDATE]:
      "Consolidator: linear scaling — refine statistical gates, trim debt, stabilize the core path.",
    [Polarity.DISRUPT]:
      "Disruptor: non-linear probes — stress Aji entropy seeds and outlier docs; do not mutate live thresholds speculatively.",
  };
}

/**
 * Tension peaks when `growthLevel` sits on the decision boundary (true bipolar fork).
 */
export function computeExistentialWeight(
  growthLevel: number,
  threshold: number,
  band = SCHISM_TENSION_BAND
): number {
  const g = clampGrowth(growthLevel);
  const d = Math.abs(g - threshold);
  return 1 - Math.min(d / Math.max(band, 1e-6), 1);
}

function computeGrowthImpact(chosen: Polarity, existentialWeight: number): number {
  const base = chosen === Polarity.DISRUPT ? 1.25 : 1.05;
  return base + existentialWeight * (chosen === Polarity.DISRUPT ? 0.75 : 0.45);
}

/**
 * Deterministic bipolar split from current growth vs threshold (no RNG).
 */
export function triggerSchism(state: ModuleState): ExistentialChoice {
  const moduleName = state.moduleName.trim() || "unknown_module";
  const growthLevel = clampGrowth(state.growthLevel);
  const growthThreshold =
    state.growthThreshold != null && Number.isFinite(state.growthThreshold)
      ? clampGrowth(state.growthThreshold)
      : SCHISM_DEFAULT_GROWTH_THRESHOLD;
  const split = defaultSplit(moduleName);
  const chosen: Polarity =
    growthLevel >= growthThreshold ? Polarity.DISRUPT : Polarity.CONSOLIDATE;
  const existentialWeight = computeExistentialWeight(growthLevel, growthThreshold);
  const growthImpact = computeGrowthImpact(chosen, existentialWeight);

  return {
    moduleName,
    split,
    chosen,
    growthLevel,
    growthThreshold,
    existentialWeight,
    growthImpact,
  };
}

/**
 * Wraps sprint KPI logging with a **directional** schism record (`schism_choice` + integrity sprint line).
 */
export function concludeModuleSprint(
  state: ModuleState,
  extra?: Record<string, unknown>
): ExistentialChoice {
  const choice = triggerSchism(state);
  logEvent("schism_choice", {
    moduleName: choice.moduleName,
    chosen: choice.chosen,
    growthLevel: choice.growthLevel,
    growthThreshold: choice.growthThreshold,
    existentialWeight: choice.existentialWeight,
    growthImpact: choice.growthImpact,
    polarityA: choice.split[Polarity.CONSOLIDATE],
    polarityB: choice.split[Polarity.DISRUPT],
    note:
      "Sprint schism — narrative / telemetry fork only; production gates unchanged unless explicitly coded and reviewed.",
  });
  logSprintComplete(choice.moduleName, {
    schismChosen: choice.chosen,
    existentialWeight: choice.existentialWeight,
    growthImpact: choice.growthImpact,
    ...extra,
  });
  return choice;
}

/** Convenience for the Gatekeeper / validate.ts gate family. */
export function triggerGatekeeperSchism(growthLevel: number): ExistentialChoice {
  return triggerSchism({
    moduleName: SCHISM_MODULE_GATEKEEPER,
    growthLevel,
  });
}
