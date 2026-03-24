import { describe, expect, it } from "vitest";
import type { AICandidate, Panelist, SerumState } from "@alchemist/shared-types";
import {
  buildTriadParityHarnessRecord,
  diffTriadParitySnapshots,
  snapshotTriadAnalysis,
} from "../triad-parity-report";
import { runTriad } from "../triad";

const PARITY_PROMPT =
  "triad parity harness pad sharp bass — deterministic token shape for cross-mode comparison.";

function emptyState(): SerumState {
  return {
    meta: {},
    master: {},
    oscA: {},
    oscB: {},
    noise: {},
    filter: {},
    envelopes: [],
    lfos: [],
    fx: {},
    matrix: [],
  };
}

const REASON =
  "Parity harness reasoning meets minimum character length for validation gates in shared-engine.";

function synthCand(panelist: Panelist, score: number): AICandidate {
  return {
    state: emptyState(),
    score,
    reasoning: REASON,
    panelist,
  };
}

describe("triad parity harness — same prompt, measurable diffs", () => {
  it("stub vs synthetic fully_live fetcher produces structured snapshot diffs", async () => {
    const stub = await runTriad(PARITY_PROMPT, { skipTablebase: true });
    const fetcherFull = async (_p: string, panelist: Panelist, _s: AbortSignal) => {
      await new Promise((r) => setTimeout(r, 210));
      return [synthCand(panelist, 0.72), synthCand(panelist, 0.71)];
    };
    const live = await runTriad(PARITY_PROMPT, { fetcher: fetcherFull, skipTablebase: true });

    const sStub = snapshotTriadAnalysis("stub", stub);
    const sLive = snapshotTriadAnalysis("fetcher_fully_live", live);

    expect(sStub.triadParityMode).toBe("stub");
    expect(sStub.triadDegraded).toBe(false);
    expect(sStub.panelOutcomeFingerprint.split("|").length).toBe(3);

    expect(sLive.triadParityMode).toBe("fully_live");
    expect(sLive.triadDegraded).toBe(false);
    expect(sLive.meanPanelistMs).toBeGreaterThan(100);

    const diff = diffTriadParitySnapshots(sStub, sLive);
    const fields = new Set(diff.map((d) => d.field));
    expect(fields.has("triadParityMode")).toBe(true);
    expect(fields.has("triadRunMode")).toBe(true);
    expect(fields.has("meanPanelistMs")).toBe(true);
    expect(fields.has("afterGateCount")).toBe(true);
    expect(fields.has("rankingFingerprint")).toBe(true);
    expect(sStub.panelOutcomeFingerprint).toBe(sLive.panelOutcomeFingerprint);

    const record = buildTriadParityHarnessRecord(PARITY_PROMPT, [sStub, sLive], [diff]);
    expect(record.event).toBe("triad_parity_harness");
    expect(record.promptLen).toBe(PARITY_PROMPT.length);
  });

  it("mixed fetcher (one panel fails) → triadParityMode mixed + triadDegraded", async () => {
    const fetcherMixed = async (_p: string, panelist: Panelist, _s: AbortSignal) => {
      if (panelist === "LLAMA") {
        throw new Error("synthetic llama outage");
      }
      await new Promise((r) => setTimeout(r, 210));
      return [synthCand(panelist, 0.65)];
    };
    const mixed = await runTriad(PARITY_PROMPT, { fetcher: fetcherMixed, skipTablebase: true });
    expect(mixed.triadRunTelemetry?.triadParityMode).toBe("mixed");
    expect(mixed.triadRunTelemetry?.triadDegraded).toBe(true);
    expect(mixed.triadRunTelemetry?.triadPanelOutcomes?.find((o) => o.panelist === "LLAMA")?.failed).toBe(
      true
    );
  });

  it("throwIfTriadNotFullyLive throws on mixed fetcher path", async () => {
    const fetcherMixed = async (_p: string, panelist: Panelist, _s: AbortSignal) => {
      if (panelist === "QWEN") {
        return [];
      }
      await new Promise((r) => setTimeout(r, 210));
      return [synthCand(panelist, 0.6)];
    };
    await expect(
      runTriad(PARITY_PROMPT, {
        fetcher: fetcherMixed,
        skipTablebase: true,
        throwIfTriadNotFullyLive: true,
      })
    ).rejects.toThrow(/strict full-live enforced/i);
  });
});
