import { describe, expect, it } from "vitest";
import type { AIAnalysis } from "@alchemist/shared-types";
import {
  buildFxpExportProvenanceV1,
  buildFxpGateSummary,
  fxpProvenanceSidecarFilename,
  sha256HexUtf8,
} from "../fxp-provenance";

describe("fxp-provenance", () => {
  it("sha256HexUtf8 is stable for UTF-8", async () => {
    const a = await sha256HexUtf8("alchemy");
    const b = await sha256HexUtf8("alchemy");
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it("buildFxpGateSummary includes telemetry and export row", () => {
    const analysis: AIAnalysis = {
      candidates: [],
      triadRunTelemetry: {
        meanPanelistMs: 200,
        triadFailureRate: 0,
        gateDropRate: 0.1,
        triadRunMode: "fetcher",
        rawCandidateCount: 6,
        afterGateCount: 4,
        triadParityMode: "fully_live",
        triadDegraded: false,
      },
    };
    const ranked = [
      {
        state: {} as AIAnalysis["candidates"][0]["state"],
        score: 0.9,
        reasoning: "x".repeat(20),
        panelist: "LLAMA" as const,
      },
    ];
    const g = buildFxpGateSummary(analysis, ranked, 0);
    expect(g).toContain("parity=fully_live");
    expect(g).toContain("export=LLAMA");
  });

  it("buildFxpExportProvenanceV1 marks browser hardGateValidated false", async () => {
    const analysis: AIAnalysis = {
      candidates: [],
      triadRunTelemetry: {
        meanPanelistMs: 100,
        triadFailureRate: 0,
        gateDropRate: 0,
        triadRunMode: "stub",
        rawCandidateCount: 6,
        afterGateCount: 2,
        triadParityMode: "stub",
        triadDegraded: false,
      },
    };
    const p = await buildFxpExportProvenanceV1({
      prompt: "pad bass",
      analysis,
      rankedAfterScore: [
        {
          state: {} as AIAnalysis["candidates"][0]["state"],
          score: 0.5,
          reasoning: "y".repeat(20),
          panelist: "QWEN",
        },
      ],
      exportCandidate: {
        state: {} as AIAnalysis["candidates"][0]["state"],
        score: 0.5,
        reasoning: "y".repeat(20),
        panelist: "QWEN",
      },
      exportRankIndex: 0,
      programName: "TestProg",
      wasmReal: true,
      healthResponseJson: {
        triad: { triadFullyLive: true },
        hardGate: {
          hardGateMonorepoRootResolved: true,
          hardGateOffsetMapFilePresent: true,
          hardGateValidateScriptPresent: true,
          hardGateSampleInitFxpPresent: true,
        },
      },
      promptMatchesLastRun: true,
    });
    expect(p.hardGateValidated).toBe(false);
    expect(p.schema).toBe("alchemist.fxp_provenance");
    expect(p.version).toBe(1);
    expect(p.exportTrustTier).toBe("verified");
    expect(p.hardGateRepoArtifactsPresent).toBe(true);
  });

  it("fxpProvenanceSidecarFilename appends suffix", () => {
    expect(fxpProvenanceSidecarFilename("A.fxp")).toBe("A.fxp.provenance.json");
  });
});
