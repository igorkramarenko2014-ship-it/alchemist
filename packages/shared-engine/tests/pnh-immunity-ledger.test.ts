import { describe, expect, it } from "vitest";
import { runPnhGhostWar } from "../pnh/pnh-ghost-run";
import { buildPnhImmunityLedger } from "../pnh/immunity-ledger";

describe("PNH immunity ledger", () => {
  it("builds one ledger row per probe", () => {
    const report = runPnhGhostWar();
    const probes = report.scenarios.reduce((n, s) => n + s.probes.length, 0);
    const ledger = buildPnhImmunityLedger(report);
    expect(ledger.length).toBe(probes);
  });

  it("contains deterministic vaccine rows for canonical probes", () => {
    const report = runPnhGhostWar();
    const ledger = buildPnhImmunityLedger(report);
    const row = ledger.find(
      (x) => x.scenarioId === "GATE_BYPASS_PAYLOAD" && x.probeId === "param_out_of_range",
    );
    expect(row).toBeDefined();
    expect(row?.vaccine).toContain("range");
    expect(row?.checkLocation).toContain("validate.ts");
    expect(typeof row?.ts).toBe("string");
  });
});

