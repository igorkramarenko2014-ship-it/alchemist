import { describe, expect, it } from "vitest";
import {
  buildPnhEnforcementProposalsFromFailureDetails,
  buildPnhEnforcementProposals,
  inferPnhFixContext,
} from "../pnh/pnh-proposal-model";
import { runPnhGhostWar } from "../pnh/pnh-ghost-run";
import { runPnhModelWarfare } from "../pnh/pnh-warfare-model";
import { buildPnhSimulationReport } from "../pnh/pnh-simulation-engine";

describe("pnh proposal model", () => {
  it("maps gate bypass scenario to gate-focused targets", () => {
    const ctx = inferPnhFixContext("ghost:GATE_BYPASS_PAYLOAD:param_out_of_range", "ghost");
    expect(ctx.fixDomains).toContain("gates");
    expect(ctx.targetFiles.some((p) => p.includes("validate.ts"))).toBe(true);
  });

  it("emits review-only proposals for failed simulation rows", () => {
    const ghost = runPnhGhostWar();
    const warfare = runPnhModelWarfare({ maxSequences: 3, target: "all" });
    const report = buildPnhSimulationReport(ghost, warfare, {});
    const proposals = buildPnhEnforcementProposals(report);
    const failedRows = report.rows.filter((r) => !r.pass);
    expect(proposals.length).toBeGreaterThanOrEqual(failedRows.length);
    for (const p of proposals) {
      expect(p.note).toMatch(/not auto-applied|Human review/i);
      expect(p.targetFiles.length).toBeGreaterThan(0);
      expect(p.rationale.length).toBeGreaterThan(20);
    }
  });

  it("rebuilds proposals from verifyTruth failure details for replay flow", () => {
    const detectedAt = new Date().toISOString();
    const proposals = buildPnhEnforcementProposalsFromFailureDetails(
      [
        {
          id: "warfare:A1",
          suite: "warfare",
          severity: "high",
          location: "warfare :: warfare:A1",
          detail: "Ghost Parameter shift",
          message: "[HIGH] warfare :: warfare:A1 — Ghost Parameter shift",
        },
      ],
      "warning",
      detectedAt,
    );
    expect(proposals).toHaveLength(1);
    expect(proposals[0]?.scenarioId).toBe("warfare:A1");
    expect(proposals[0]?.enforcementLevel).toBe("blocking_ci_until_resolved");
  });
});
