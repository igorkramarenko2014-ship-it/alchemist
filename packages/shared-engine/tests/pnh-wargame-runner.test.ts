import { describe, expect, it } from "vitest";
import { runPnhWarGame, type PnhWarGameHostTruth } from "../pnh/pnh-wargame";

function hostTruthBase(): PnhWarGameHostTruth {
  return {
    wasmArtifactTruth: "real",
    wasmBrowserFxpEncodeReady: true,
    hardGateOffsetMapFilePresent: true,
    hardGateValidateScriptPresent: true,
    hardGateSampleInitFxpPresent: true,
  };
}

describe("PNH war game runner", () => {
  it("classifies wasm unavailable as breached and blocks release", () => {
    const report = runPnhWarGame(
      {
        ...hostTruthBase(),
        wasmArtifactTruth: "missing_wasm",
        wasmBrowserFxpEncodeReady: false,
      },
      { releaseModeRequested: true },
    );
    const wasm = report.results.find((r) => r.scenarioId === "WASM_UNAVAILABLE_EXPORT_REQUESTED");
    expect(wasm).toBeTruthy();
    expect(wasm!.releaseImpact).toBe("block_release");
    expect(wasm!.classification).toBe("breached");
    expect(report.releaseShouldBeBlocked).toBe(true);
  });

  it("classifies hard gate missing sample as breached and blocks release in release mode", () => {
    const report = runPnhWarGame(
      {
        ...hostTruthBase(),
        hardGateSampleInitFxpPresent: false,
      },
      { releaseModeRequested: true },
    );
    const hg = report.results.find((r) => r.scenarioId === "HARD_GATE_MISSING_SAMPLE_RELEASE_MODE");
    expect(hg).toBeTruthy();
    expect(hg!.releaseImpact).toBe("block_release");
    expect(hg!.classification).toBe("breached");
    expect(report.releaseShouldBeBlocked).toBe(true);
  });

  it("repeated medium escalation degrades (but does not block release) when slavic dedupe is intact", () => {
    const report = runPnhWarGame(hostTruthBase(), { releaseModeRequested: true });
    const sl = report.results.find((r) => r.scenarioId.startsWith("SLAVIC_SWARM_CREDIT_DRAIN:repeats_"));
    expect(sl).toBeTruthy();
    expect(sl!.classification).toBe("degraded");
    // Current war game probe uses different descriptions, and Alchemist slavic dedupe may keep multiple rows.
    // That should map to review_release (not allow_release and not block_release).
    expect(sl!.releaseImpact).toBe("review_release");
  });

  it("report format is stable and includes required fields", () => {
    const report = runPnhWarGame(hostTruthBase(), { releaseModeRequested: true });
    expect(report.generatedAt).toBeTypeOf("string");
    expect(report.results.length).toBe(5);
    expect(Array.isArray(report.results)).toBe(true);
    for (const r of report.results) {
      expect(r.scenarioId).toBeTypeOf("string");
      expect(["survive", "degraded", "breached"]).toContain(r.classification);
      expect(["allow_release", "review_release", "block_release"]).toContain(r.releaseImpact);
      expect(r.whatFailed).toBeInstanceOf(Array);
      expect(r.whatDegraded).toBeInstanceOf(Array);
      expect(r.affectedFiles).toBeInstanceOf(Array);
      expect(r.likelyNextPatchTargets).toBeInstanceOf(Array);
    }
  });
});

