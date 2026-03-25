/**
 * PNH attack memory — **in-process** event ring + pattern detection (no cross-deploy persistence).
 *
 * **Limits:** serverless / multi-instance = one store per isolate; use an explicit partition key
 * (e.g. client IP hash) so behavior is inspectable, not “hidden global user tracking” without naming it.
 */
import type { IntentHardenerReason } from "../intent-hardener";
import type { PnhAdaptiveAction } from "./pnh-context-types";
import type { PnhScenarioId } from "./pnh-scenarios";

/** Catalog scenarios plus stable buckets for non-catalog intent failures. */
export type PnhMemoryScenarioKey = PnhScenarioId | "INTENT_HARD_GUARD";

export type PnhAttackSurface = "triad_intent";

export interface PnhAttackEvent {
  readonly t: number;
  readonly scenarioKey: PnhMemoryScenarioKey;
  readonly surface: PnhAttackSurface;
  readonly intentReason?: IntentHardenerReason;
}

export type PnhEscalationLevel = "none" | "warn" | "degrade" | "block";

export interface PnhDetectedPattern {
  readonly id: string;
  readonly message: string;
  readonly level: PnhEscalationLevel;
}

export interface PnhSessionStateSnapshot {
  readonly partitionKey: string;
  readonly recentEvents: readonly PnhAttackEvent[];
  readonly scenarioCountsTotal: Readonly<Partial<Record<PnhMemoryScenarioKey, number>>>;
  readonly scenarioCountsBurst: Readonly<Partial<Record<PnhMemoryScenarioKey, number>>>;
  readonly lastTriggerTime: number;
}

export interface PnhMemoryInspection {
  readonly snapshot: PnhSessionStateSnapshot;
  readonly patterns: readonly PnhDetectedPattern[];
  readonly escalationLevel: PnhEscalationLevel;
}

const BURST_WINDOW_MS = 60_000;
const MULTI_SURFACE_WINDOW_MS = 120_000;
const SLOW_APT_WINDOW_MS = 600_000;
const SLOW_GAP_MIN_MS = 120_000;
const MAX_EVENTS_PER_PARTITION = 128;
const RETENTION_MS = 86_400_000;

const CATALOG_KEYS = new Set<PnhMemoryScenarioKey>([
  "GATE_BYPASS_PAYLOAD",
  "PROMPT_HIJACK_TRIAD",
  "SLAVIC_SWARM_CREDIT_DRAIN",
]);

const levelRank: Record<PnhEscalationLevel, number> = {
  none: 0,
  warn: 1,
  degrade: 2,
  block: 3,
};

function maxLevel(a: PnhEscalationLevel, b: PnhEscalationLevel): PnhEscalationLevel {
  return levelRank[a] >= levelRank[b] ? a : b;
}

/** Map intent rejection to a stable memory key (APT-style multi-surface uses catalog ids where possible). */
export function intentReasonToPnhMemoryScenarioKey(reason: IntentHardenerReason): PnhMemoryScenarioKey {
  if (reason === "jailbreak_instruction" || reason === "implausible_param_request") {
    return "PROMPT_HIJACK_TRIAD";
  }
  if (reason === "low_signal_prompt" || reason === "pathological_repetition") {
    return "SLAVIC_SWARM_CREDIT_DRAIN";
  }
  return "INTENT_HARD_GUARD";
}

function countInWindow(
  events: readonly PnhAttackEvent[],
  scenarioKey: PnhMemoryScenarioKey,
  now: number,
  windowMs: number
): number {
  const lo = now - windowMs;
  let n = 0;
  for (const e of events) {
    if (e.t >= lo && e.scenarioKey === scenarioKey) n += 1;
  }
  return n;
}

function distinctCatalogInWindow(events: readonly PnhAttackEvent[], now: number, windowMs: number): number {
  const lo = now - windowMs;
  const s = new Set<PnhMemoryScenarioKey>();
  for (const e of events) {
    if (e.t >= lo && CATALOG_KEYS.has(e.scenarioKey)) s.add(e.scenarioKey);
  }
  return s.size;
}

function slowSameScenarioPattern(events: readonly PnhAttackEvent[], scenarioKey: PnhMemoryScenarioKey, now: number): boolean {
  const lo = now - SLOW_APT_WINDOW_MS;
  const same = events.filter((e) => e.t >= lo && e.scenarioKey === scenarioKey).sort((a, b) => a.t - b.t);
  if (same.length < 3) return false;
  const tail = same.slice(-3);
  for (let i = 1; i < tail.length; i++) {
    const gap = tail[i]!.t - tail[i - 1]!.t;
    if (gap < SLOW_GAP_MIN_MS) return false;
  }
  return true;
}

function tierFromBurstCount(n: number): PnhEscalationLevel {
  if (n <= 0) return "none";
  if (n === 1) return "warn";
  if (n < 5) return "degrade";
  return "block";
}

function detectPatterns(
  events: readonly PnhAttackEvent[],
  scenarioKey: PnhMemoryScenarioKey,
  now: number
): { patterns: PnhDetectedPattern[]; escalationLevel: PnhEscalationLevel } {
  const patterns: PnhDetectedPattern[] = [];
  let escalation: PnhEscalationLevel = "none";

  const burstSame = countInWindow(events, scenarioKey, now, BURST_WINDOW_MS);
  const burstTier = tierFromBurstCount(burstSame);
  escalation = maxLevel(escalation, burstTier);
  if (burstSame >= 5) {
    patterns.push({
      id: "burst_same_scenario",
      message: `${burstSame}× same scenario in ${BURST_WINDOW_MS / 1000}s window — persistent probe posture.`,
      level: "block",
    });
  } else if (burstSame >= 3) {
    patterns.push({
      id: "repeat_same_scenario",
      message: `${burstSame}× same scenario in short window — repeated probing.`,
      level: "degrade",
    });
  } else if (burstSame === 2) {
    patterns.push({
      id: "repeat_same_scenario_lite",
      message: "2× same scenario in burst window — degrade tier.",
      level: "degrade",
    });
  } else if (burstSame === 1) {
    patterns.push({
      id: "first_occurrence_window",
      message: "First matching event in burst window — warn tier.",
      level: "warn",
    });
  }

  const multi = distinctCatalogInWindow(events, now, MULTI_SURFACE_WINDOW_MS);
  if (multi >= 2) {
    patterns.push({
      id: "multi_surface_catalog",
      message: `${multi} distinct PNH catalog surfaces in ${MULTI_SURFACE_WINDOW_MS / 1000}s — suspicious mix (e.g. hijack + gate/slavic).`,
      level: "degrade",
    });
    escalation = maxLevel(escalation, "degrade");
  }

  if (slowSameScenarioPattern(events, scenarioKey, now)) {
    patterns.push({
      id: "slow_spacing_same_scenario",
      message: "Slow-spaced same-scenario events (APT-style timing) — escalate floor to degrade.",
      level: "degrade",
    });
    escalation = maxLevel(escalation, "degrade");
  }

  return { patterns, escalationLevel: escalation };
}

function buildScenarioCounts(
  events: readonly PnhAttackEvent[],
  now: number
): Partial<Record<PnhMemoryScenarioKey, number>> {
  const total: Partial<Record<PnhMemoryScenarioKey, number>> = {};
  const lo = now - RETENTION_MS;
  for (const e of events) {
    if (e.t < lo) continue;
    total[e.scenarioKey] = (total[e.scenarioKey] ?? 0) + 1;
  }
  return total;
}

function buildBurstCounts(
  events: readonly PnhAttackEvent[],
  now: number
): Partial<Record<PnhMemoryScenarioKey, number>> {
  const out: Partial<Record<PnhMemoryScenarioKey, number>> = {};
  const lo = now - BURST_WINDOW_MS;
  for (const e of events) {
    if (e.t < lo) continue;
    out[e.scenarioKey] = (out[e.scenarioKey] ?? 0) + 1;
  }
  return out;
}

type Partition = { events: PnhAttackEvent[] };

export class PnhAttackMemoryStore {
  private readonly partitions = new Map<string, Partition>();

  recordIntentFailure(partitionKey: string, reason: IntentHardenerReason, nowMs: number = Date.now()): PnhMemoryInspection {
    const scenarioKey = intentReasonToPnhMemoryScenarioKey(reason);
    const event: PnhAttackEvent = {
      t: nowMs,
      scenarioKey,
      surface: "triad_intent",
      intentReason: reason,
    };

    let p = this.partitions.get(partitionKey);
    if (p === undefined) {
      p = { events: [] };
      this.partitions.set(partitionKey, p);
    }
    p.events.push(event);

    const lo = nowMs - RETENTION_MS;
    p.events = p.events.filter((e) => e.t >= lo);
    if (p.events.length > MAX_EVENTS_PER_PARTITION) {
      p.events.splice(0, p.events.length - MAX_EVENTS_PER_PARTITION);
    }

    const { patterns, escalationLevel } = detectPatterns(p.events, scenarioKey, nowMs);
    const snapshot: PnhSessionStateSnapshot = {
      partitionKey,
      recentEvents: [...p.events],
      scenarioCountsTotal: buildScenarioCounts(p.events, nowMs),
      scenarioCountsBurst: buildBurstCounts(p.events, nowMs),
      lastTriggerTime: nowMs,
    };

    return { snapshot, patterns, escalationLevel };
  }

  /** Lightweight inspect without recording (e.g. health dashboards). */
  getSnapshot(partitionKey: string, nowMs: number = Date.now()): PnhSessionStateSnapshot | undefined {
    const p = this.partitions.get(partitionKey);
    if (p === undefined || p.events.length === 0) return undefined;
    return {
      partitionKey,
      recentEvents: [...p.events],
      scenarioCountsTotal: buildScenarioCounts(p.events, nowMs),
      scenarioCountsBurst: buildBurstCounts(p.events, nowMs),
      lastTriggerTime: p.events[p.events.length - 1]!.t,
    };
  }

  clearPartition(partitionKey: string): void {
    this.partitions.delete(partitionKey);
  }

  clearAllForTests(): void {
    this.partitions.clear();
  }
}

let defaultStore: PnhAttackMemoryStore | null = null;

export function getDefaultPnhAttackMemoryStore(): PnhAttackMemoryStore {
  if (defaultStore === null) defaultStore = new PnhAttackMemoryStore();
  return defaultStore;
}

export function resetPnhAttackMemoryForTests(): void {
  defaultStore?.clearAllForTests();
  defaultStore = null;
}

export function escalationLevelToActionFloor(level: PnhEscalationLevel): PnhAdaptiveAction {
  switch (level) {
    case "none":
      return "allow";
    case "warn":
      return "warn";
    case "degrade":
      return "degrade";
    case "block":
      return "block";
    default:
      return "allow";
  }
}

export function maxPnhAdaptiveAction(a: PnhAdaptiveAction, b: PnhAdaptiveAction): PnhAdaptiveAction {
  const rank: Record<PnhAdaptiveAction, number> = { allow: 0, warn: 1, degrade: 2, block: 3 };
  return rank[a] >= rank[b] ? a : b;
}
