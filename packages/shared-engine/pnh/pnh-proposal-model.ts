/**
 * **IOM-safe PNH enforcement proposals** — auditable recommendations only.
 * Never auto-applied; not read by **`igor:apply`** (power-cell flow stays separate).
 *
 * Artifacts: **`tools/pnh-proposals.jsonl`** (gitignored), emitted by **`pnpm pnh:simulate`**
 * and refreshable via **`pnpm pnh:proposals`** from **`tools/pnh-simulation-last.json`**.
 */
import type {
  PnhSecurityFailureDetail,
  PnhSimulationPnhStatus,
  PnhSimulationReport,
  PnhSimulationRow,
} from "./pnh-simulation-engine";

export const PNH_PROPOSAL_KIND = "pnh_enforcement" as const;
export const PNH_PROPOSAL_BATCH_KIND = "pnh_proposals_batch" as const;

/** Where engineering work likely lands (diagnostic hint, not a runtime router). */
export type PnhFixDomain = "triad" | "gates" | "verify" | "export" | "docs";

/**
 * Human policy tier — descriptive; CI behavior stays in **`pnh-simulate --ci`**, not this string.
 */
export type PnhEnforcementLevel = "advisory" | "recommended" | "blocking_ci_until_resolved";

export interface PnhEnforcementProposal {
  readonly kind: typeof PNH_PROPOSAL_KIND;
  /** Stable id for diff/review (`pnh_enf_warfare__A1`). */
  readonly proposalId: string;
  readonly scenarioId: string;
  readonly severity: "high" | "medium" | "low" | "info";
  readonly detectedAt: string;
  readonly targetFiles: readonly string[];
  readonly fixDomains: readonly PnhFixDomain[];
  readonly recommendedAction: string;
  readonly enforcementLevel: PnhEnforcementLevel;
  readonly rationale: string;
  readonly provenance: "pnh-proposal-model.ts";
  readonly suite: string;
  readonly simulationOutcome: string;
  readonly pnhStatusAtEmit: PnhSimulationPnhStatus;
  readonly note: string;
}

export interface PnhProposalsBatchHeader {
  readonly kind: typeof PNH_PROPOSAL_BATCH_KIND;
  readonly generatedAt: string;
  readonly pnhStatus: PnhSimulationPnhStatus;
  readonly securityVerdict: "pass" | "degraded" | "fail" | null;
  readonly proposalCount: number;
  readonly provenance: string;
  readonly note: string;
}

function slugProposalId(scenarioId: string): string {
  const s = scenarioId.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, "") || "unknown";
  return `pnh_enf_${s}`.slice(0, 120);
}

function enforcementLevelFor(
  severity: PnhSimulationRow["severity"],
  kind: "row_fail" | "regression" | "baseline_gap",
): PnhEnforcementLevel {
  if (kind !== "row_fail") return "blocking_ci_until_resolved";
  if (severity === "high") return "blocking_ci_until_resolved";
  if (severity === "medium") return "recommended";
  return "advisory";
}

/**
 * Map PNH scenario id + suite to likely fix surfaces (Phase 1 operator map).
 */
export function inferPnhFixContext(
  scenarioId: string,
  suite: PnhSimulationRow["suite"] | "baseline" | "baseline_regression" | "verify",
): { fixDomains: PnhFixDomain[]; targetFiles: string[] } {
  if (suite === "baseline" || suite === "baseline_regression") {
    return {
      fixDomains: ["verify", "docs"],
      targetFiles: [
        "tools/pnh-simulation-baseline.json",
        "scripts/pnh-simulate.ts",
        "docs/FIRE.md",
      ],
    };
  }
  if (scenarioId.startsWith("regression:") || scenarioId.includes("baseline:missing")) {
    return {
      fixDomains: ["verify", "docs"],
      targetFiles: [
        "tools/pnh-simulation-baseline.json",
        "scripts/pnh-simulate.ts",
        "packages/shared-engine/pnh/pnh-simulation-engine.ts",
      ],
    };
  }
  if (suite === "ghost" || scenarioId.startsWith("ghost:")) {
    if (scenarioId.includes("GATE_BYPASS")) {
      return {
        fixDomains: ["gates", "verify"],
        targetFiles: [
          "packages/shared-engine/validate.ts",
          "packages/shared-engine/score.ts",
          "packages/shared-engine/tests/gate-integrity.test.ts",
        ],
      };
    }
    if (scenarioId.includes("PROMPT_HIJACK") || scenarioId.includes("HIJACK")) {
      return {
        fixDomains: ["triad", "gates"],
        targetFiles: [
          "packages/shared-engine/intent-hardener.ts",
          "packages/shared-engine/pnh/pnh-triad-defense.ts",
          "apps/web-app/app/api/triad-panel-route",
        ],
      };
    }
    return {
      fixDomains: ["gates", "verify"],
      targetFiles: [
        "packages/shared-engine/pnh/pnh-ghost-run.ts",
        "packages/shared-engine/tests/pnh-ghost-run.test.ts",
      ],
    };
  }
  if (suite === "warfare" || scenarioId.startsWith("warfare:")) {
    if (/^warfare:A[123]$/i.test(scenarioId)) {
      return {
        fixDomains: ["export", "gates"],
        targetFiles: [
          "packages/fxp-encoder/",
          "packages/shared-engine/pnh/pnh-warfare-model.ts",
          "tools/validate-offsets.py",
        ],
      };
    }
    if (/^warfare:B[0-9]$/i.test(scenarioId)) {
      return {
        fixDomains: ["triad", "gates"],
        targetFiles: [
          "packages/shared-engine/score.ts",
          "packages/shared-engine/validate.ts",
          "packages/shared-engine/pnh/pnh-warfare-model.ts",
        ],
      };
    }
    if (/^warfare:C[0-9]$/i.test(scenarioId)) {
      return {
        fixDomains: ["gates", "docs"],
        targetFiles: ["packages/shared-engine/gates.ts", "docs/FIRE.md"],
      };
    }
    return {
      fixDomains: ["verify", "docs"],
      targetFiles: ["scripts/pnh-simulate.ts", "packages/shared-engine/pnh/pnh-warfare-model.ts"],
    };
  }
  if (suite === "intent_stub" || scenarioId.startsWith("intent:")) {
    return {
      fixDomains: ["triad"],
      targetFiles: [
        "packages/shared-engine/intent-hardener.ts",
        "apps/web-app/lib/triad-llm-normalize.ts",
      ],
    };
  }
  if (suite === "apt" || scenarioId.startsWith("apt:")) {
    return {
      fixDomains: ["docs"],
      targetFiles: ["packages/shared-engine/pnh/pnh-apt-scenarios.ts"],
    };
  }
  return {
    fixDomains: ["verify", "docs"],
    targetFiles: ["scripts/run-verify-with-summary.mjs", "docs/FIRE.md"],
  };
}

function rowToProposal(row: PnhSimulationRow, pnhStatus: PnhSimulationPnhStatus, detectedAt: string): PnhEnforcementProposal {
  const { fixDomains, targetFiles } = inferPnhFixContext(row.id, row.suite);
  const level = enforcementLevelFor(row.severity, "row_fail");
  return {
    kind: PNH_PROPOSAL_KIND,
    proposalId: slugProposalId(row.id),
    scenarioId: row.id,
    severity: row.severity,
    detectedAt,
    targetFiles,
    fixDomains,
    recommendedAction: `Close PNH gap for ${row.id}: align implementation with expectation "${row.expectation}" (actual=${row.actual}).`,
    enforcementLevel: level,
    rationale: `PNH simulation row failed — ${row.detail}. Suite=${row.suite}; IOM lists this as diagnostic input only (no auto-mutation).`,
    provenance: "pnh-proposal-model.ts",
    suite: row.suite,
    simulationOutcome: row.actual,
    pnhStatusAtEmit: pnhStatus,
    note: "Human review — not applied by igor:apply; does not change gates or triad weights at runtime.",
  };
}

function regressionToProposal(
  id: string,
  before: string,
  after: string,
  pnhStatus: PnhSimulationPnhStatus,
  detectedAt: string,
): PnhEnforcementProposal {
  const scenarioId = `regression:${id}`;
  const { fixDomains, targetFiles } = inferPnhFixContext(scenarioId, "baseline_regression");
  return {
    kind: PNH_PROPOSAL_KIND,
    proposalId: slugProposalId(scenarioId),
    scenarioId,
    severity: "high",
    detectedAt,
    targetFiles,
    fixDomains,
    recommendedAction: `Restore defensive posture for ${id}: fingerprint regressed (${before} → ${after}). Re-verify probes and update baseline only after intentional change + review.`,
    enforcementLevel: "blocking_ci_until_resolved",
    rationale:
      "Operational fingerprint weakened vs tools/pnh-simulation-baseline.json — regression guard is telemetry-first; this proposal records required human follow-up.",
    provenance: "pnh-proposal-model.ts",
    suite: "baseline_regression",
    simulationOutcome: after,
    pnhStatusAtEmit: pnhStatus,
    note: "Human review — refresh baseline only with explicit operator intent (pnpm pnh:simulate -- --write-baseline).",
  };
}

function missingBaselineProposal(
  missingCount: number,
  sampleKeys: readonly string[],
  pnhStatus: PnhSimulationPnhStatus,
  detectedAt: string,
): PnhEnforcementProposal {
  const scenarioId = "baseline:missing_fingerprint_keys";
  const { fixDomains, targetFiles } = inferPnhFixContext(scenarioId, "baseline");
  return {
    kind: PNH_PROPOSAL_KIND,
    proposalId: "pnh_enf_baseline_missing_keys",
    scenarioId,
    severity: "high",
    detectedAt,
    targetFiles,
    fixDomains,
    recommendedAction:
      "Align simulation runner with committed baseline keys or regenerate baseline after deliberate catalog change.",
    enforcementLevel: "blocking_ci_until_resolved",
    rationale: `PNH --ci found ${missingCount} missing fingerprint key(s) vs baseline (sample: ${sampleKeys.slice(0, 6).join(", ")}).`,
    provenance: "pnh-proposal-model.ts",
    suite: "baseline",
    simulationOutcome: "missing_keys",
    pnhStatusAtEmit: pnhStatus,
    note: "Human review — do not delete baseline keys without updating operational probes.",
  };
}

/**
 * Build reviewable proposals from a full simulation report (no I/O).
 */
export function buildPnhEnforcementProposals(report: PnhSimulationReport): PnhEnforcementProposal[] {
  const detectedAt = report.generatedAt;
  const out: PnhEnforcementProposal[] = [];
  for (const row of report.rows) {
    if (!row.pass) {
      out.push(rowToProposal(row, report.pnhStatus, detectedAt));
    }
  }
  if (report.diff) {
    for (const r of report.diff.regressions) {
      out.push(regressionToProposal(r.id, r.before, r.after, report.pnhStatus, detectedAt));
    }
    if (report.diff.missingKeys.length > 0) {
      out.push(
        missingBaselineProposal(
          report.diff.missingKeys.length,
          report.diff.missingKeys,
          report.pnhStatus,
          detectedAt,
        ),
      );
    }
  }
  return out;
}

function suiteFromFailureId(id: string): PnhSimulationRow["suite"] | "baseline" | "baseline_regression" {
  if (id.startsWith("regression:")) return "baseline_regression";
  if (id.startsWith("baseline:")) return "baseline";
  if (id.startsWith("ghost:")) return "ghost";
  if (id.startsWith("warfare:")) return "warfare";
  if (id.startsWith("intent:")) return "intent_stub";
  if (id.startsWith("apt:")) return "apt";
  return "ghost";
}

/**
 * Rebuild proposals from **`verifyTruth.failureDetails`** (e.g. **`pnh-simulation-last.json`**) without re-running probes.
 * Slightly less precise than **`buildPnhEnforcementProposals`** but sufficient for operator replay / diff.
 */
export function buildPnhEnforcementProposalsFromFailureDetails(
  details: readonly PnhSecurityFailureDetail[],
  pnhStatus: PnhSimulationPnhStatus,
  detectedAt: string,
): PnhEnforcementProposal[] {
  const out: PnhEnforcementProposal[] = [];
  for (const d of details) {
    if (d.id === "baseline:missing_keys") {
      out.push(
        missingBaselineProposal(
          1,
          ["(see tools/pnh-simulation-last.json verifyTruth)"],
          pnhStatus,
          detectedAt,
        ),
      );
      continue;
    }
    const suite = suiteFromFailureId(d.id);
    const { fixDomains, targetFiles } = inferPnhFixContext(d.id, suite);
    const severity = (d.severity === "high" || d.severity === "medium" || d.severity === "low" || d.severity === "info"
      ? d.severity
      : "medium") as PnhSimulationRow["severity"];
    const level =
      d.severity === "high" || suite === "baseline_regression"
        ? ("blocking_ci_until_resolved" as const)
        : d.severity === "medium"
          ? ("recommended" as const)
          : ("advisory" as const);
    out.push({
      kind: PNH_PROPOSAL_KIND,
      proposalId: slugProposalId(d.id),
      scenarioId: d.id,
      severity,
      detectedAt,
      targetFiles,
      fixDomains,
      recommendedAction: `Address PNH finding ${d.id}: ${d.detail.slice(0, 200)}${d.detail.length > 200 ? "…" : ""}`,
      enforcementLevel: level,
      rationale: `Emitted from verifyTruth.failureDetails — ${d.message}. IOM diagnostic only.`,
      provenance: "pnh-proposal-model.ts",
      suite,
      simulationOutcome: "fail",
      pnhStatusAtEmit: pnhStatus,
      note: "Replayed from last.json — run pnpm pnh:simulate for full ledger + regressions.",
    });
  }
  return dedupeProposalsByScenarioId(out);
}

function dedupeProposalsByScenarioId(proposals: PnhEnforcementProposal[]): PnhEnforcementProposal[] {
  const seen = new Set<string>();
  const out: PnhEnforcementProposal[] = [];
  for (const p of proposals) {
    if (seen.has(p.scenarioId)) continue;
    seen.add(p.scenarioId);
    out.push(p);
  }
  return out;
}

export function formatPnhProposalsJsonl(
  proposals: readonly PnhEnforcementProposal[],
  batch: PnhProposalsBatchHeader,
): string {
  const lines = [JSON.stringify(batch)];
  for (const p of proposals) {
    lines.push(JSON.stringify(p));
  }
  return `${lines.join("\n")}\n`;
}
