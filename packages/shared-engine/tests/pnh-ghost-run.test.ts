import { describe, expect, it } from "vitest";
import { runPnhGhostWar } from "../pnh/pnh-ghost-run";
import { PNH_SCENARIOS } from "../pnh/pnh-scenarios";
import { buildPnhImmunityLedger, recordImmunity } from "../pnh/immunity-ledger";

describe("PNH — ghost war (predictive hardening probes)", () => {
  it("registers the canonical scenario set", () => {
    const ids = PNH_SCENARIOS.map((s) => s.id).sort();
    expect(ids).toEqual(
      ["GATE_BYPASS_PAYLOAD", "PROMPT_HIJACK_TRIAD", "SLAVIC_SWARM_CREDIT_DRAIN"].sort(),
    );
  });

  it("ImmunityReport passes — no high-severity breaches", () => {
    const report = runPnhGhostWar();
    expect(report.passed).toBe(true);
    expect(report.highSeverityBreaches).toBe(0);
    for (const s of report.scenarios) {
      if (s.severity === "high") {
        expect(s.breachCount, `${s.scenarioId} must have zero breaches`).toBe(0);
      }
    }
  });

  it("emits stable scenario ids for ledger / telemetry", () => {
    const report = runPnhGhostWar();
    expect(report.scenarios.map((s) => s.scenarioId)).toEqual([
      "GATE_BYPASS_PAYLOAD",
      "PROMPT_HIJACK_TRIAD",
      "SLAVIC_SWARM_CREDIT_DRAIN",
    ]);
  });

  it("writes immunity ledger JSONL rows for ghost probes", () => {
    const report = runPnhGhostWar();
    const rows = buildPnhImmunityLedger(report);
    for (const row of rows) {
      recordImmunity(row);
    }
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.some((r) => r.outcome === "immune")).toBe(true);
  });
});
