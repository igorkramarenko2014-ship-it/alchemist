import { describe, expect, it } from "vitest";
import {
  buildPnhSimulationReport,
  comparePnhFingerprints,
  isPnhPipelineBreachRow,
} from "../pnh/pnh-simulation-engine";
import { runPnhGhostWar } from "../pnh/pnh-ghost-run";
import { runPnhModelWarfare } from "../pnh/pnh-warfare-model";

describe("comparePnhFingerprints", () => {
  it("flags immune → breach as regression", () => {
    const d = comparePnhFingerprints(
      { "ghost:X:p1": "breach" },
      { "ghost:X:p1": "immune" },
    );
    expect(d.regressions.some((r) => r.id === "ghost:X:p1")).toBe(true);
  });

  it("ignores breach → skipped for optional WASM byte probes", () => {
    const d = comparePnhFingerprints({ "warfare:A1": "skipped" }, { "warfare:A1": "breach" });
    expect(d.regressions).toHaveLength(0);
  });

  it("lists operational new keys", () => {
    const d = comparePnhFingerprints(
      { "ghost:NEW:probe": "immune" },
      { "warfare:B4": "immune" },
    );
    expect(d.newKeys).toContain("ghost:NEW:probe");
  });
});

describe("isPnhPipelineBreachRow", () => {
  it("treats warfare A1 failure as non-pipeline-breach (warning tier)", () => {
    expect(
      isPnhPipelineBreachRow({
        id: "warfare:A1",
        suite: "warfare",
        severity: "high",
        expectation: "defended",
        actual: "breach",
        pass: false,
        detail: "",
      }),
    ).toBe(false);
  });

  it("treats B4 failure as pipeline breach", () => {
    expect(
      isPnhPipelineBreachRow({
        id: "warfare:B4",
        suite: "warfare",
        severity: "high",
        expectation: "defended",
        actual: "breach",
        pass: false,
        detail: "",
      }),
    ).toBe(true);
  });
});

describe("buildPnhSimulationReport (integration)", () => {
  it("produces stable shape with live ghost + minimal warfare", () => {
    const ghost = runPnhGhostWar();
    const warfare = runPnhModelWarfare({ maxSequences: 2, target: "all" });
    const r = buildPnhSimulationReport(ghost, warfare, {});
    expect(r.totalScenarios).toBeGreaterThan(10);
    expect(r.fingerprints).toMatchObject(
      expect.objectContaining({
        "ghost:GATE_BYPASS_PAYLOAD:param_out_of_range": "immune",
      }),
    );
    expect(["clean", "warning", "breach"]).toContain(r.pnhStatus);
  });
});
