import { describe, expect, it } from "vitest";
import { getIgorOrchestratorManifest } from "../igor-orchestrator-layer";
import {
  detectSchisms,
  digestIgorManifestForPulse,
  getIOMHealthPulse,
  IOM_PULSE_VERSION,
} from "../iom-pulse";

describe("iom pulse", () => {
  it("getIOMHealthPulse returns pulseVersion, manifestDigest, and suggestions", () => {
    const p = getIOMHealthPulse({});
    expect(p.pulseVersion).toBe(IOM_PULSE_VERSION);
    expect(p.manifestDigest.packageCount).toBeGreaterThan(0);
    expect(p.manifestDigest.powerCellCount).toBeGreaterThan(0);
    expect(p.schisms.length).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(p.suggestions)).toBe(true);
    expect(p.suggestions.length).toBe(p.schisms.length);
  });

  it("detectSchisms flags TRIAD_CIRCUIT_OPEN when openTriadCircuitPanelists set", () => {
    const m = getIgorOrchestratorManifest();
    const s = detectSchisms({ openTriadCircuitPanelists: ["DEEPSEEK", "LLAMA"] }, m);
    const row = s.find((x) => x.code === "TRIAD_CIRCUIT_OPEN");
    expect(row).toBeDefined();
    expect(row?.message).toContain("DEEPSEEK");
    expect(row?.message).toContain("LLAMA");
    const p = getIOMHealthPulse({ openTriadCircuitPanelists: ["QWEN"] });
    expect(p.schisms.some((x) => x.code === "TRIAD_CIRCUIT_OPEN")).toBe(true);
    const sug = p.suggestions.find((x) => x.cellId === "TRIAD_CIRCUIT_OPEN");
    expect(sug?.action).toContain("verify:keys");
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
    const p = getIOMHealthPulse({
      triad: {
        triadFullyLive: false,
        anyPanelistLive: true,
        livePanelists: ["deepseek"],
      },
    });
    const sug = p.suggestions.find((x) => x.cellId === "PARTIAL_TRIAD_VELOCITY");
    expect(sug?.provenance).toBe("iom_schism");
    expect(sug?.action).toContain("verify:keys");
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
    const soeSug = p.suggestions.filter((x) => x.provenance === "soe_fusion_hint");
    expect(soeSug.length).toBeGreaterThan(0);
    expect(soeSug[0]?.cellId.startsWith("soe_fusion:")).toBe(true);
  });

  it("getIOMHealthPulse passes iomCoverageScore into SOE when snapshot passed", () => {
    const p = getIOMHealthPulse({
      soeSnapshot: {
        meanPanelistMs: 2000,
        triadFailureRate: 0.05,
        gateDropRate: 0.7,
      },
      iomCoverageScore: 0.81,
    });
    expect(p.soe?.message).toContain("0.81");
  });

  it("detectSchisms adds SOE_TRIAD_FAILURE_HIGH when triadFailureRate > 0.3", () => {
    const m = getIgorOrchestratorManifest();
    const s = detectSchisms(
      {
        soeSnapshot: {
          meanPanelistMs: 2000,
          triadFailureRate: 0.35,
          gateDropRate: 0.1,
        },
      },
      m,
    );
    expect(s.some((x) => x.code === "SOE_TRIAD_FAILURE_HIGH")).toBe(true);
  });

  it("detectSchisms adds SOE_LATENCY_NUMERIC when meanPanelistMs > 8000", () => {
    const m = getIgorOrchestratorManifest();
    const s = detectSchisms(
      {
        soeSnapshot: {
          meanPanelistMs: 9000,
          triadFailureRate: 0,
          gateDropRate: 0,
        },
      },
      m,
    );
    expect(s.some((x) => x.code === "SOE_LATENCY_NUMERIC")).toBe(true);
  });

  it("digestIgorManifestForPulse marks over budget when >12 cells", () => {
    const m = getIgorOrchestratorManifest();
    const d = digestIgorManifestForPulse(m);
    expect(d.powerCellCount).toBeGreaterThan(12);
    expect(d.overPolicyCellBudget).toBe(true);
  });
});
