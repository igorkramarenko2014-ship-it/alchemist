import { describe, expect, it } from "vitest";
import { getIgorOrchestratorManifest } from "../igor-orchestrator-layer";
import {
  detectSchisms,
  digestIgorManifestForPulse,
  getIOMHealthPulse,
  IOM_PULSE_VERSION,
} from "../iom-pulse";

describe("iom pulse", () => {
  it("getIOMHealthPulse returns pulseVersion and manifestDigest", () => {
    const p = getIOMHealthPulse({});
    expect(p.pulseVersion).toBe(IOM_PULSE_VERSION);
    expect(p.manifestDigest.packageCount).toBeGreaterThan(0);
    expect(p.manifestDigest.powerCellCount).toBeGreaterThan(0);
    expect(p.schisms.length).toBeGreaterThanOrEqual(0);
  });

  it("detectSchisms flags partial triad", () => {
    const m = getIgorOrchestratorManifest();
    const s = detectSchisms(
      {
        triad: {
          triadFullyLive: false,
          anyPanelistLive: true,
          livePanelists: ["deepseek"],
        },
      },
      m,
    );
    expect(s.some((x) => x.code === "PARTIAL_TRIAD_VELOCITY")).toBe(true);
  });

  it("detectSchisms flags MODEL_GATE_DECOUPLE from snapshot", () => {
    const m = getIgorOrchestratorManifest();
    const s = detectSchisms(
      {
        soeSnapshot: {
          meanPanelistMs: 2000,
          triadFailureRate: 0.05,
          gateDropRate: 0.7,
        },
      },
      m,
    );
    expect(s.some((x) => x.code === "MODEL_GATE_DECOUPLE")).toBe(true);
  });

  it("detectSchisms flags PIPELINE_SILENT_CHOKE", () => {
    const m = getIgorOrchestratorManifest();
    const s = detectSchisms(
      {
        soeSnapshot: {
          meanPanelistMs: 2000,
          triadFailureRate: 0.05,
          gateDropRate: 0.95,
        },
      },
      m,
    );
    expect(s.some((x) => x.code === "PIPELINE_SILENT_CHOKE")).toBe(true);
  });

  it("getIOMHealthPulse includes soe when snapshot passed", () => {
    const p = getIOMHealthPulse({
      soeSnapshot: {
        meanPanelistMs: 1000,
        triadFailureRate: 0,
        gateDropRate: 0,
      },
    });
    expect(p.soe).toBeDefined();
    expect(p.soe?.fusionHintCodes?.length).toBeGreaterThan(0);
  });

  it("digestIgorManifestForPulse marks over budget when >12 cells", () => {
    const m = getIgorOrchestratorManifest();
    const d = digestIgorManifestForPulse(m);
    expect(d.powerCellCount).toBeGreaterThan(12);
    expect(d.overPolicyCellBudget).toBe(true);
  });
});
