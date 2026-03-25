/**
 * ADVERSARIAL TRIAGE MATRIX (PNH) — deterministic policy (no hidden governance).
 *
 * Phase goals:
 * - One typed source of truth for scenario/attack findings → action + verify consequence.
 * - Callers (triad, gates, verify/telemetry) should consult this instead of ad hoc branching.
 *
 * Scope:
 * - Includes the 3 canonical PNH scenarios (`pnh-scenarios.ts`)
 * - Includes the PNH APT catalog entries (`pnh-apt-scenarios.ts`)
 * - Includes the PNH warfare ledger keys (`pnh-warfare-model.ts` ids)
 */
import type { PnhScenarioId } from "./pnh-scenarios";
import { PNH_SCENARIOS } from "./pnh-scenarios";
import type { PnhAptScenario } from "./pnh-apt-scenarios";
import { PNH_APT_SCENARIO_CATALOG } from "./pnh-apt-scenarios";
import type { PnhEnvironmentClass, PnhRiskLevel, PnhTriadLane } from "./pnh-context-types";
export type PnhSimulationPnhStatus = "clean" | "warning" | "breach";

export type PnhTriageRuntimeAction = "allow" | "warn" | "degrade" | "block";
export type PnhTriageVerifyOutcome = "pass" | "degraded" | "fail";
export type PnhTriageReleaseImpact = "ship" | "review" | "block_release";

export interface PnhTriageContext {
  lane: PnhTriadLane;
  riskLevel: PnhRiskLevel;
  environment: PnhEnvironmentClass;
  /** Session/attempt count used for deterministic escalation. */
  repeats: number;
}

export interface PnhTriagePolicy {
  /** Telemetry severity tier. */
  severity: "high" | "medium" | "low" | "info";
  confidence: number; // 0..1
  likelyBlastRadius: readonly string[];
  /**
   * Preferred runtime action when a breach is detected (deterministic given `PnhTriageContext`).
   * Does not auto-mutate; callers decide how to implement.
   */
  preferredResponseOnBreach: (ctx: PnhTriageContext) => PnhTriageRuntimeAction;
  /**
   * How verify should interpret this breach in rollups.
   * - `fail` => CI blocks on security verdict
   * - `degraded` => CI warns/degrades posture (still visible and actionable)
   * - `pass` => does not affect CI security posture
   */
  verifyOutcomeOnBreach: PnhTriageVerifyOutcome;
  /** Release impact for operators (diagnostic guidance). */
  releaseImpactOnBreach: PnhTriageReleaseImpact;
}

export type PnhWarfareSeqId =
  | "A1"
  | "A2"
  | "A3"
  | "B4"
  | "B5"
  | "B6"
  | "C7"
  | "C8"
  | "C9";

export type PnhWarfareFindingId = `warfare:${PnhWarfareSeqId}`;
export type PnhGhostFindingId = `ghost:${PnhScenarioId}:${string}`;
export type PnhIntentStubFindingId = `intent:stub:${string}`;
export type PnhAptFindingId = `apt:${PnhAptScenario["id"]}`;

export type PnhFindingId =
  | PnhGhostFindingId
  | PnhIntentStubFindingId
  | PnhWarfareFindingId
  | PnhScenarioId
  | PnhAptFindingId;

const WARFARE_IDS: readonly PnhWarfareSeqId[] = ["A1", "A2", "A3", "B4", "B5", "B6", "C7", "C8", "C9"];

function policyForPnhScenario(sid: PnhScenarioId): PnhTriagePolicy {
  const found = PNH_SCENARIOS.find((s) => s.id === sid);
  const severity = found?.severity === "high" ? "high" : "medium";

  if (sid === "GATE_BYPASS_PAYLOAD") {
    return {
      severity,
      confidence: 0.95,
      likelyBlastRadius: ["gates", "validate", "filterValid", "export/fxp integrity (indirect)"],
      preferredResponseOnBreach: (ctx) => {
        if (ctx.repeats >= 2 && ctx.lane !== "stub") return "block";
        if (ctx.riskLevel === "critical") return "block";
        return "degrade";
      },
      verifyOutcomeOnBreach: "fail",
      releaseImpactOnBreach: "block_release",
    };
  }

  if (sid === "PROMPT_HIJACK_TRIAD") {
    return {
      severity,
      confidence: 0.93,
      likelyBlastRadius: ["triad prompt pipeline", "intent-hardener", "pnh-triad-defense", "route error behavior"],
      preferredResponseOnBreach: (ctx) => {
        if (ctx.lane === "stub") return "warn";
        return "block";
      },
      verifyOutcomeOnBreach: "fail",
      releaseImpactOnBreach: "block_release",
    };
  }

  if (sid === "SLAVIC_SWARM_CREDIT_DRAIN") {
    return {
      severity,
      confidence: 0.72,
      likelyBlastRadius: ["Slavic cosine/text dedupe", "score ranking stability", "candidate diversity collapse"],
      preferredResponseOnBreach: (ctx) => {
        if (ctx.environment === "hostile" || ctx.repeats >= 2) return "block";
        return "degrade";
      },
      verifyOutcomeOnBreach: "degraded",
      releaseImpactOnBreach: "review",
    };
  }

  // exhaustive guard
  return {
    severity,
    confidence: 0.4,
    likelyBlastRadius: ["verify/telemetry"],
    preferredResponseOnBreach: () => "degrade",
    verifyOutcomeOnBreach: "degraded",
    releaseImpactOnBreach: "review",
  };
}

function policyForWarfareSeq(seqId: PnhWarfareSeqId): PnhTriagePolicy {
  // Keep existing behavior intent: A1/A2 are "high severity telemetry" but not pipeline-fail.
  // B4/B5/B6 are pipeline-fail.
  // C7/C8 medium degrades; C9 is info/pass.
  switch (seqId) {
    case "A1":
    case "A2":
      return {
        severity: "high",
        confidence: 0.75,
        likelyBlastRadius: ["WASM/bridge encode/decode invariants", "gates paramArray structural checks", "export stability"],
        preferredResponseOnBreach: () => "degrade",
        verifyOutcomeOnBreach: "degraded",
        releaseImpactOnBreach: "review",
      };
    case "A3":
      return {
        severity: "medium",
        confidence: 0.7,
        likelyBlastRadius: ["Slavic cosine/text dedupe behavior", "ranking stability"],
        preferredResponseOnBreach: (ctx) => (ctx.environment === "hostile" ? "block" : "degrade"),
        verifyOutcomeOnBreach: "degraded",
        releaseImpactOnBreach: "review",
      };
    case "B4":
    case "B5":
    case "B6":
      return {
        severity: "high",
        confidence: 0.9,
        likelyBlastRadius: ["triad intent guard", "prompt-guard", "Jailbreak-class detection", "route failure modes"],
        preferredResponseOnBreach: (ctx) => (ctx.lane === "stub" ? "warn" : "block"),
        verifyOutcomeOnBreach: "fail",
        releaseImpactOnBreach: "block_release",
      };
    case "C7":
    case "C8":
      return {
        severity: "medium",
        confidence: 0.6,
        likelyBlastRadius: ["latency / circuit breaker pacing", "pnh scorer stability", "timeout paths"],
        preferredResponseOnBreach: () => "degrade",
        verifyOutcomeOnBreach: "degraded",
        releaseImpactOnBreach: "review",
      };
    case "C9":
    default:
      return {
        severity: "info",
        confidence: 0.4,
        likelyBlastRadius: ["non-failing info ledger"],
        preferredResponseOnBreach: () => "allow",
        verifyOutcomeOnBreach: "pass",
        releaseImpactOnBreach: "ship",
      };
  }
}

function policyForAptScenario(apt: PnhAptScenario): PnhTriagePolicy {
  return {
    severity: "info",
    confidence: 0.45,
    likelyBlastRadius: ["platform hygiene", "ci safety", "observability"],
    preferredResponseOnBreach: () => "allow",
    verifyOutcomeOnBreach: "pass",
    releaseImpactOnBreach: apt.status === "concept_only" ? "review" : "review",
  };
}

export function triagePolicyForFindingId(findingId: string): PnhTriagePolicy | null {
  // scenario ids
  if (PNH_SCENARIOS.some((s) => s.id === findingId)) {
    return policyForPnhScenario(findingId as PnhScenarioId);
  }

  // ghost findings: ghost:<scenarioId>:<probeId>
  if (findingId.startsWith("ghost:")) {
    const parts = findingId.split(":");
    const sid = parts[1] as PnhScenarioId | undefined;
    if (sid && PNH_SCENARIOS.some((s) => s.id === sid)) return policyForPnhScenario(sid);
    return null;
  }

  // warfare findings: warfare:A1 ... warfare:C9
  if (findingId.startsWith("warfare:")) {
    const seqId = findingId.slice("warfare:".length) as PnhWarfareSeqId;
    if (WARFARE_IDS.includes(seqId)) return policyForWarfareSeq(seqId);
    return null;
  }

  // intent stub findings
  if (findingId.startsWith("intent:stub:")) {
    // Treat as PROMPT_HIJACK verification posture (pipeline fail).
    return policyForPnhScenario("PROMPT_HIJACK_TRIAD");
  }

  // apt findings: apt:<id>
  if (findingId.startsWith("apt:")) {
    const id = findingId.slice("apt:".length);
    const apt = PNH_APT_SCENARIO_CATALOG.find((a) => a.id === id);
    if (apt) return policyForAptScenario(apt);
    return null;
  }

  return null;
}

export function deterministicRuntimeActionForScenarioBreach(
  scenarioId: PnhScenarioId,
  ctx: PnhTriageContext,
): PnhTriageRuntimeAction {
  return policyForPnhScenario(scenarioId).preferredResponseOnBreach(ctx);
}

/**
 * Map PNH simulation statuses to verify security rollup.
 * (kept here for deterministic, centralized mapping)
 */
export function securityVerdictFromTriageState(
  state: PnhSimulationPnhStatus,
): "pass" | "degraded" | "fail" {
  if (state === "clean") return "pass";
  if (state === "warning") return "degraded";
  return "fail";
}

export function verifyOutcomeFromFindingId(findingId: string): PnhTriageVerifyOutcome {
  const p = triagePolicyForFindingId(findingId);
  return p?.verifyOutcomeOnBreach ?? "degraded";
}

export function severityFromFindingId(findingId: string): PnhTriagePolicy["severity"] {
  return triagePolicyForFindingId(findingId)?.severity ?? "medium";
}

